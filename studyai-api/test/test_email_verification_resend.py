from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from app.core.security import (
    generate_email_verification_code,
    hash_email_verification_code,
)
from app.db.connection import get_engine
from app.repositories import email_verification_repository
from app.services import email_verification_service


@pytest.fixture
def resend_user(monkeypatch):
    """Crear un usuario temporal en la base de pruebas."""

    test_url = get_engine().url.set(database="studyai_test_db")
    test_engine = create_engine(test_url, pool_pre_ping=True)

    with test_engine.connect() as connection:
        database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database == "studyai_test_db"

    monkeypatch.setattr(
        email_verification_repository,
        "get_engine",
        lambda: test_engine,
    )

    email = f"resend-{uuid4().hex}@example.com"
    user_id = None

    try:
        with test_engine.begin() as connection:
            user_id = connection.execute(
                text("""
                    INSERT INTO users (
                        full_name,
                        email,
                        password_hash
                    )
                    VALUES (
                        'Usuario de prueba',
                        :email,
                        'hash-de-prueba'
                    )
                    RETURNING id;
                """),
                {"email": email},
            ).scalar_one()

        yield user_id, email, test_engine

    finally:
        if user_id is not None:
            with test_engine.begin() as connection:
                connection.execute(
                    text("""
                        DELETE FROM email_verification_tokens
                        WHERE user_id = :user_id;
                    """),
                    {"user_id": user_id},
                )

                connection.execute(
                    text("""
                        DELETE FROM users
                        WHERE id = :user_id;
                    """),
                    {"user_id": user_id},
                )

        test_engine.dispose()


def allow_resend(engine, user_id: int) -> None:
    """Simular que transcurrieron más de 60 segundos."""

    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE email_verification_tokens
                SET created_at = CURRENT_TIMESTAMP - INTERVAL '61 seconds'
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        )


def test_resend_replaces_previous_code(resend_user, monkeypatch):
    """Reemplazar el código anterior manteniendo cinco minutos de validez."""

    user_id, email, engine = resend_user

    original_hash = hash_email_verification_code(email, "123456")
    new_hash = hash_email_verification_code(email, "654321")

    email_verification_repository.save_email_verification_token(
        user_id,
        original_hash,
    )

    allow_resend(engine, user_id)

    monkeypatch.setattr(
        email_verification_service,
        "generate_email_verification_code",
        lambda received_email: (
            "654321",
            hash_email_verification_code(received_email, "654321"),
        ),
    )

    new_code = email_verification_service.prepare_email_verification_code_resend(
        email.upper()
    )

    assert new_code == "654321"

    with engine.connect() as connection:
        saved_codes = connection.execute(
            text("""
                SELECT token_hash, created_at, expires_at
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).mappings().all()

    assert len(saved_codes) == 1
    assert saved_codes[0]["token_hash"] == new_hash
    assert saved_codes[0]["token_hash"] != original_hash

    assert (
        saved_codes[0]["expires_at"] - saved_codes[0]["created_at"]
    ) == timedelta(minutes=5)


def test_resend_invalidates_previous_code(resend_user, monkeypatch):
    """Invalidar el código anterior y consumir el nuevo una sola vez."""

    user_id, email, engine = resend_user

    old_code = "123456"
    old_hash = hash_email_verification_code(email, old_code)

    new_code = "654321"

    email_verification_repository.save_email_verification_token(
        user_id,
        old_hash,
    )

    allow_resend(engine, user_id)

    monkeypatch.setattr(
        email_verification_service,
        "generate_email_verification_code",
        lambda received_email: (
            new_code,
            hash_email_verification_code(received_email, new_code),
        ),
    )

    generated_code = (
        email_verification_service.prepare_email_verification_code_resend(
            email
        )
    )

    assert generated_code == new_code

    assert email_verification_service.verify_user_email_code(
        email,
        old_code,
    ) is False

    assert email_verification_service.verify_user_email_code(
        email,
        new_code,
    ) is True

    assert email_verification_service.verify_user_email_code(
        email,
        new_code,
    ) is False


def test_resend_unknown_email(resend_user):
    """No generar códigos para un correo inexistente."""

    unknown_email = f"unknown-{uuid4().hex}@example.com"

    assert (
        email_verification_service.prepare_email_verification_code_resend(
            unknown_email
        )
        is None
    )


def test_resend_verified_user(resend_user):
    """No generar códigos para un usuario verificado."""

    user_id, email, engine = resend_user

    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE users
                SET email_verified_at = CURRENT_TIMESTAMP
                WHERE id = :user_id;
            """),
            {"user_id": user_id},
        )

    assert (
        email_verification_service.prepare_email_verification_code_resend(
            email
        )
        is None
    )


def test_resend_inactive_user(resend_user):
    """No generar códigos para usuarios inactivos."""

    user_id, email, engine = resend_user

    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE users
                SET is_active = FALSE
                WHERE id = :user_id;
            """),
            {"user_id": user_id},
        )

    assert (
        email_verification_service.prepare_email_verification_code_resend(
            email
        )
        is None
    )


def test_resend_rollback_on_invalid_hash(resend_user):
    """Conservar el código anterior si el nuevo hash es inválido."""

    user_id, email, engine = resend_user

    _, original_hash = generate_email_verification_code(email)

    email_verification_repository.save_email_verification_token(
        user_id,
        original_hash,
    )

    allow_resend(engine, user_id)

    with pytest.raises(IntegrityError):
        email_verification_repository.replace_email_verification_token_for_unverified_user(
            email,
            "invalid-hash",
        )

    with engine.connect() as connection:
        saved_hash = connection.execute(
            text("""
                SELECT token_hash
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).scalar_one()

    assert saved_hash == original_hash


def test_resend_blocked_before_60_seconds(resend_user):
    """Bloquear el reenvío cuando todavía no han pasado 60 segundos."""

    user_id, email, engine = resend_user

    _, original_hash = generate_email_verification_code(email)

    email_verification_repository.save_email_verification_token(
        user_id,
        original_hash,
    )

    new_code = (
        email_verification_service.prepare_email_verification_code_resend(
            email
        )
    )

    with engine.connect() as connection:
        saved_hash = connection.execute(
            text("""
                SELECT token_hash
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).scalar_one()

    assert new_code is None
    assert saved_hash == original_hash


def test_resend_blocked_after_recent_resend(resend_user):
    """Impedir dos reenvíos consecutivos dentro de 60 segundos."""

    user_id, email, engine = resend_user

    _, original_hash = generate_email_verification_code(email)

    email_verification_repository.save_email_verification_token(
        user_id,
        original_hash,
    )

    allow_resend(engine, user_id)

    first_code = (
        email_verification_service.prepare_email_verification_code_resend(
            email
        )
    )

    second_code = (
        email_verification_service.prepare_email_verification_code_resend(
            email
        )
    )

    with engine.connect() as connection:
        saved_hash = connection.execute(
            text("""
                SELECT token_hash
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).scalar_one()

    assert first_code is not None
    assert second_code is None

    assert saved_hash == hash_email_verification_code(
        email,
        first_code,
    )