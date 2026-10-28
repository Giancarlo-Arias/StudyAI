from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import auth_repository


@pytest.fixture
def login_user(monkeypatch):
    """Crear un usuario únicamente en la base de pruebas."""

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

    email = f"login_{uuid4().hex}@example.com"

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
                    'Usuario Login',
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
                text("DELETE FROM users WHERE id = :id"),
                {"id": user_id},
            )

        test_engine.dispose()


def test_get_user_for_authentication(login_user):
    _, user_id, email = login_user

    user = auth_repository.get_user_for_authentication(email)

    assert user is not None
    assert user["id"] == user_id
    assert user["email"] == email
    assert user["password_hash"] == "hash-de-prueba"
    assert user["is_active"] is True
    assert user["email_verified_at"] is not None


def test_get_user_case_insensitive(login_user):
    _, user_id, email = login_user

    user = auth_repository.get_user_for_authentication(
        f"  {email.upper()}  "
    )

    assert user is not None
    assert user["id"] == user_id


def test_get_unknown_user(login_user):
    user = auth_repository.get_user_for_authentication(
        f"unknown_{uuid4().hex}@example.com"
    )

    assert user is None


def test_get_unverified_user(login_user):
    engine, user_id, email = login_user

    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE users
                SET email_verified_at = NULL
                WHERE id = :id;
            """),
            {"id": user_id},
        )

    user = auth_repository.get_user_for_authentication(email)

    assert user is not None
    assert user["email_verified_at"] is None