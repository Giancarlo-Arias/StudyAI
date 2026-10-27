from datetime import timedelta
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from app.core.security import (
    generate_email_verification_token,
    hash_email_verification_token,
)
from app.db.connection import get_engine
from app.repositories import email_verification_repository
from app.services.email_verification_service import (
    prepare_email_verification_resend,
    verify_user_email,
)


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


def test_resend_replaces_previous_token(resend_user):
    user_id, email, engine = resend_user

    _, original_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id,
        original_hash,
    )

    allow_resend(engine, user_id)

    new_token = prepare_email_verification_resend(email.upper())

    assert new_token is not None

    with engine.connect() as connection:
        saved_tokens = connection.execute(
            text("""
                SELECT token_hash, created_at, expires_at
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).mappings().all()

    assert len(saved_tokens) == 1
    assert saved_tokens[0]["token_hash"] == (
        hash_email_verification_token(new_token)
    )
    assert saved_tokens[0]["token_hash"] != original_hash

    assert (
        saved_tokens[0]["expires_at"] - saved_tokens[0]["created_at"]
    ) == timedelta(minutes=5)


def test_resend_invalidates_previous_link(resend_user):
    user_id, email, engine = resend_user

    old_token, old_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id,
        old_hash,
    )

    allow_resend(engine, user_id)

    new_token = prepare_email_verification_resend(email)

    assert new_token is not None
    assert verify_user_email(old_token) is False
    assert verify_user_email(new_token) is True
    assert verify_user_email(new_token) is False


def test_resend_unknown_email(resend_user):
    unknown_email = f"unknown-{uuid4().hex}@example.com"

    assert prepare_email_verification_resend(unknown_email) is None


def test_resend_verified_user(resend_user):
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

    assert prepare_email_verification_resend(email) is None


def test_resend_inactive_user(resend_user):
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

    assert prepare_email_verification_resend(email) is None


def test_resend_rollback_on_invalid_hash(resend_user):
    user_id, email, engine = resend_user

    _, original_hash = generate_email_verification_token()

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
    user_id, email, engine = resend_user

    _, original_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id,
        original_hash,
    )

    new_token = prepare_email_verification_resend(email)

    with engine.connect() as connection:
        saved_hash = connection.execute(
            text("""
                SELECT token_hash
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).scalar_one()

    assert new_token is None
    assert saved_hash == original_hash


def test_resend_blocked_after_recent_resend(resend_user):
    user_id, email, engine = resend_user

    _, original_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id,
        original_hash,
    )

    allow_resend(engine, user_id)

    first_token = prepare_email_verification_resend(email)
    second_token = prepare_email_verification_resend(email)

    with engine.connect() as connection:
        saved_hash = connection.execute(
            text("""
                SELECT token_hash
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).scalar_one()

    assert first_token is not None
    assert second_token is None
    assert saved_hash == hash_email_verification_token(first_token)