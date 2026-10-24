from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.core.security import generate_email_verification_token
from app.db.connection import get_engine
from app.repositories import email_verification_repository


@pytest.fixture
def verification_user(monkeypatch):
    """Crear un usuario temporal en la base exclusiva de pruebas."""

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

    email = f"verification-{uuid4().hex}@example.com"

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
                        'Verification Test',
                        :email,
                        'test-only-password-hash'
                    )
                    RETURNING id;
                """),
                {"email": email},
            ).scalar_one()

        yield user_id, test_engine

    finally:
        if "user_id" in locals():
            with test_engine.begin() as connection:
                connection.execute(
                    text("DELETE FROM users WHERE id = :user_id"),
                    {"user_id": user_id},
                )

        test_engine.dispose()


def test_save_and_replace_token(verification_user):
    user_id, engine = verification_user

    _, first_hash = generate_email_verification_token()
    _, second_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id, first_hash
    )

    email_verification_repository.save_email_verification_token(
        user_id, second_hash
    )

    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT token_hash
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).mappings().all()

    assert len(rows) == 1
    assert rows[0]["token_hash"] == second_hash


def test_delete_token(verification_user):
    user_id, _ = verification_user

    _, token_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id, token_hash
    )

    deleted = email_verification_repository.delete_email_verification_token(
        user_id
    )

    assert deleted is True
    assert (
        email_verification_repository.delete_email_verification_token(user_id)
        is False
    )


def test_delete_expired_tokens(verification_user):
    user_id, engine = verification_user

    _, token_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id, token_hash
    )

    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE email_verification_tokens
                SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        )

    deleted_count = (
        email_verification_repository.delete_expired_email_verification_tokens()
    )

    with engine.connect() as connection:
        remaining = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).scalar_one()

    assert deleted_count >= 1
    assert remaining == 0

def test_verify_email_token(verification_user):
    user_id, engine = verification_user

    _, token_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id, token_hash
    )

    verified = email_verification_repository.verify_email_verification_token(
        token_hash
    )

    with engine.connect() as connection:
        user = connection.execute(
            text("""
                SELECT email_verified_at
                FROM users
                WHERE id = :user_id;
            """),
            {"user_id": user_id},
        ).mappings().one()

        remaining_tokens = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        ).scalar_one()

    assert verified is True
    assert user["email_verified_at"] is not None
    assert remaining_tokens == 0


def test_cannot_reuse_email_token(verification_user):
    user_id, _ = verification_user

    _, token_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id, token_hash
    )

    first_attempt = (
        email_verification_repository.verify_email_verification_token(
            token_hash
        )
    )

    second_attempt = (
        email_verification_repository.verify_email_verification_token(
            token_hash
        )
    )

    assert first_attempt is True
    assert second_attempt is False


def test_cannot_verify_expired_email_token(verification_user):
    user_id, engine = verification_user

    _, token_hash = generate_email_verification_token()

    email_verification_repository.save_email_verification_token(
        user_id, token_hash
    )

    # Simular que el token ya venció.
    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE email_verification_tokens
                SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        )

    verified = email_verification_repository.verify_email_verification_token(
        token_hash
    )

    with engine.connect() as connection:
        email_verified_at = connection.execute(
            text("""
                SELECT email_verified_at
                FROM users
                WHERE id = :user_id;
            """),
            {"user_id": user_id},
        ).scalar_one()

    assert verified is False
    assert email_verified_at is None