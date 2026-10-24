from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from app.core.security import generate_email_verification_token
from app.db.connection import get_engine
from app.repositories import user_repository
from app.schemas.user import UserRegister
from app.services import user_service


@pytest.fixture
def registration_environment(monkeypatch):
    """Usar exclusivamente la base de datos de pruebas."""

    test_url = get_engine().url.set(database="studyai_test_db")
    test_engine = create_engine(test_url, pool_pre_ping=True)

    with test_engine.connect() as connection:
        database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database == "studyai_test_db"

    monkeypatch.setattr(
        user_repository,
        "get_engine",
        lambda: test_engine,
    )

    email = f"register-{uuid4().hex}@example.com"

    yield test_engine, email

    with test_engine.begin() as connection:
        connection.execute(
            text("DELETE FROM users WHERE email = :email"),
            {"email": email},
        )

    test_engine.dispose()


def test_register_user_creates_verification_token(
    registration_environment,
    monkeypatch,
):
    engine, email = registration_environment

    token, token_hash = generate_email_verification_token()

    monkeypatch.setattr(
        user_service,
        "generate_email_verification_token",
        lambda: (token, token_hash),
    )

    data = UserRegister(
        full_name="Usuario Prueba",
        email=email,
        password="Password-Segura-2026!",
    )

    user = user_service.register_user(data)

    with engine.connect() as connection:
        saved_token = connection.execute(
            text("""
                SELECT token_hash, expires_at, created_at
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user["id"]},
        ).mappings().one()

    assert user["email"] == email
    assert user["email_verified_at"] is None
    assert saved_token["token_hash"] == token_hash
    assert saved_token["expires_at"] > saved_token["created_at"]


def test_register_user_rolls_back_if_token_fails(
    registration_environment,
    monkeypatch,
):
    engine, email = registration_environment

    monkeypatch.setattr(
        user_service,
        "generate_email_verification_token",
        lambda: ("invalid-token", "invalid-hash"),
    )

    data = UserRegister(
        full_name="Usuario Prueba",
        email=email,
        password="Password-Segura-2026!",
    )

    with pytest.raises(IntegrityError):
        user_service.register_user(data)

    with engine.connect() as connection:
        users_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM users
                WHERE email = :email;
            """),
            {"email": email},
        ).scalar_one()

    assert users_count == 0