import asyncio
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.user import EmailVerificationCodeRequest, UserRegister
from app.services import registration_email_service, user_service


def test_verification_code_schema():
    """Validar seis dígitos y normalizar el correo."""

    data = EmailVerificationCodeRequest(
        email="Usuario@Example.com",
        code="004281",
    )

    assert str(data.email) == "usuario@example.com"
    assert data.code == "004281"


@pytest.mark.parametrize("code", ["12345", "1234567", "ABC123"])
def test_verification_code_schema_rejects_invalid_codes(code):
    """Rechazar códigos de formato incorrecto."""

    with pytest.raises(ValidationError):
        EmailVerificationCodeRequest(
            email="usuario@example.com",
            code=code,
        )


def test_register_user_with_code_verification(monkeypatch):
    """Guardar el hash del código, sin almacenar los seis dígitos."""

    captured = {}

    monkeypatch.setattr(
        user_service,
        "hash_password",
        lambda password: "hash-argon2id-test",
    )

    monkeypatch.setattr(
        user_service,
        "generate_email_verification_code",
        lambda email: ("004281", "hash-hmac-test"),
    )

    def fake_create_user(**kwargs):
        captured.update(kwargs)
        return {"id": 1, "email": kwargs["email"]}

    monkeypatch.setattr(
        user_service,
        "create_user",
        fake_create_user,
    )

    data = UserRegister(
        full_name="Usuario Prueba",
        email="usuario@example.com",
        password="ClaveSegura2026!",
    )

    user, code = user_service.register_user_with_code_verification(data)

    assert user["id"] == 1
    assert code == "004281"
    assert captured["verification_token_hash"] == "hash-hmac-test"
    assert captured["password_hash"] == "hash-argon2id-test"
    assert "004281" not in captured.values()


def test_register_and_send_code_verification(monkeypatch):
    """Enviar el código mediante Resend sin devolverlo en la API."""

    captured = {}

    monkeypatch.setattr(
        registration_email_service,
        "register_user_with_code_verification",
        lambda data: (
            {"id": 1, "email": str(data.email)},
            "004281",
        ),
    )

    monkeypatch.setattr(
        registration_email_service,
        "get_settings",
        lambda: SimpleNamespace(
            resend_api_key="re_test",
            resend_from_email="StudyAI <verify@example.com>",
        ),
    )

    async def fake_send(**kwargs):
        captured.update(kwargs)

    monkeypatch.setattr(
        registration_email_service,
        "send_verification_code_email",
        fake_send,
    )

    data = UserRegister(
        full_name="Usuario Prueba",
        email="usuario@example.com",
        password="ClaveSegura2026!",
    )

    result = asyncio.run(
        registration_email_service.register_and_send_code_verification(data)
    )

    assert result == {
        "id": 1,
        "email": "usuario@example.com",
    }

    assert captured["to_email"] == "usuario@example.com"
    assert captured["code"] == "004281"