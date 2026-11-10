from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from app.core.security import (
    generate_email_verification_code,
    hash_email_verification_code,
)
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

    # Limpiar únicamente los datos temporales de esta prueba.
    with test_engine.begin() as connection:
        connection.execute(
            text("""
                DELETE FROM email_verification_tokens
                WHERE user_id IN (
                    SELECT id
                    FROM users
                    WHERE email = :email
                );
            """),
            {"email": email},
        )

        connection.execute(
            text("""
                DELETE FROM users
                WHERE email = :email;
            """),
            {"email": email},
        )

    test_engine.dispose()


def test_register_user_creates_verification_code(
    registration_environment,
    monkeypatch,
):
    """Registrar un usuario guardando el HMAC del código."""

    engine, email = registration_environment

    code, code_hash = generate_email_verification_code(email)

    monkeypatch.setattr(
        user_service,
        "generate_email_verification_code",
        lambda received_email: (code, code_hash),
    )

    data = UserRegister(
        full_name="Usuario Prueba",
        email=email,
        password="Password-Segura-2026!",
    )

    user = user_service.register_user(data)

    with engine.connect() as connection:
        saved_code = connection.execute(
            text("""
                SELECT
                    token_hash,
                    failed_attempts,
                    expires_at,
                    created_at
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user["id"]},
        ).mappings().one()

    assert user["email"] == email
    assert user["email_verified_at"] is None

    # PostgreSQL almacena el HMAC, nunca el código original.
    assert saved_code["token_hash"] == code_hash
    assert saved_code["token_hash"] != code
    assert saved_code["failed_attempts"] == 0
    assert saved_code["expires_at"] > saved_code["created_at"]


def test_register_user_rolls_back_if_code_fails(
    registration_environment,
    monkeypatch,
):
    """Revertir la creación del usuario si falla el código."""

    engine, email = registration_environment

    monkeypatch.setattr(
        user_service,
        "generate_email_verification_code",
        lambda received_email: ("123456", "invalid-hash"),
    )

    data = UserRegister(
        full_name="Usuario Prueba",
        email=email,
        password="Password-Segura-2026!",
    )

    # El hash inválido debe incumplir la restricción de PostgreSQL.
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


def test_registration_returns_code_for_email(monkeypatch):
    """Devolver el código para su envío sin almacenarlo directamente."""

    saved_data = {}

    def fake_create_user(**kwargs):
        saved_data.update(kwargs)

        return {
            "id": 1,
            "email": kwargs["email"],
        }

    monkeypatch.setattr(
        user_service,
        "create_user",
        fake_create_user,
    )

    data = UserRegister(
        full_name="Usuario Prueba",
        email="usuario@example.com",
        password="Password-Segura-2026!",
    )

    user, code = user_service.register_user_with_code_verification(data)

    assert user["id"] == 1
    assert len(code) == 6
    assert code.isdigit()

    # Verificar que se guardaría el HMAC correcto.
    assert saved_data["verification_token_hash"] == (
        hash_email_verification_code(str(data.email), code)
    )

    # El código no forma parte de los datos públicos.
    assert "code" not in user