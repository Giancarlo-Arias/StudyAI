from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import auth_repository


@pytest.fixture
def session_user(monkeypatch):
    """Crear un usuario exclusivamente en la base de pruebas."""

    test_url = get_engine().url.set(database="studyai_test_db")
    test_engine = create_engine(test_url, pool_pre_ping=True)

    with test_engine.connect() as connection:
        database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database == "studyai_test_db"

    monkeypatch.setattr(
        auth_repository,
        "get_engine",
        lambda: test_engine,
    )

    email = f"session_{uuid4().hex}@example.com"

    with test_engine.begin() as connection:
        user_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Usuario Sesión',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    CURRENT_TIMESTAMP
                )
                RETURNING id;
            """),
            {"email": email},
        ).scalar_one()

    try:
        yield test_engine, user_id, email

    finally:
        with test_engine.begin() as connection:
            connection.execute(
                text("DELETE FROM users WHERE id = :user_id"),
                {"user_id": user_id},
            )

        test_engine.dispose()


def test_get_active_verified_user(session_user):
    _, user_id, email = session_user

    user = auth_repository.get_user_for_access(user_id)

    assert user is not None
    assert user["id"] == user_id
    assert user["email"] == email
    assert user["full_name"] == "Usuario Sesión"
    assert "password_hash" not in user


def test_reject_inactive_user(session_user):
    engine, user_id, _ = session_user

    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE users
                SET is_active = FALSE
                WHERE id = :user_id;
            """),
            {"user_id": user_id},
        )

    assert auth_repository.get_user_for_access(user_id) is None


def test_reject_unverified_user(session_user):
    engine, user_id, _ = session_user

    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE users
                SET email_verified_at = NULL
                WHERE id = :user_id;
            """),
            {"user_id": user_id},
        )

    assert auth_repository.get_user_for_access(user_id) is None


def test_reject_deleted_user(session_user):
    engine, user_id, _ = session_user

    with engine.begin() as connection:
        connection.execute(
            text("""
                DELETE FROM users
                WHERE id = :user_id;
            """),
            {"user_id": user_id},
        )

    assert auth_repository.get_user_for_access(user_id) is None