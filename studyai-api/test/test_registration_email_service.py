import asyncio
from types import SimpleNamespace

import httpx
import pytest
from sqlalchemy.exc import SQLAlchemyError

from app.schemas.user import UserRegister
from app.services import registration_email_service


def configure_test(monkeypatch):
    """Simular registro y configuración sin utilizar servicios reales."""

    def fake_register(data):
        return (
            {"id": 1, "email": str(data.email)},
            "token-de-prueba",
        )

    monkeypatch.setattr(
        registration_email_service,
        "register_user_with_verification",
        fake_register,
    )

    monkeypatch.setattr(
        registration_email_service,
        "get_settings",
        lambda: SimpleNamespace(
            resend_api_key="re_test",
            resend_from_email="StudyAI <onboarding@resend.dev>",
            email_verification_url="http://localhost:5173/verify-email",
        ),
    )


def create_test_user():
    return UserRegister(
        full_name="Usuario Prueba",
        email="usuario@example.com",
        password="Password-Segura-2026!",
    )


def test_registration_sends_email(monkeypatch):
    configure_test(monkeypatch)
    sent_emails = []

    async def fake_send(**kwargs):
        sent_emails.append(kwargs)

    monkeypatch.setattr(
        registration_email_service,
        "send_verification_email",
        fake_send,
    )

    user = asyncio.run(
        registration_email_service.register_and_send_verification(
            create_test_user()
        )
    )

    assert user["id"] == 1
    assert len(sent_emails) == 1
    assert sent_emails[0]["to_email"] == "usuario@example.com"
    assert sent_emails[0]["token"] == "token-de-prueba"
    assert "token" not in user


def test_registration_preserves_user_if_email_fails(monkeypatch):
    configure_test(monkeypatch)

    async def fake_send(**kwargs):
        raise httpx.ConnectError("Proveedor no disponible")

    monkeypatch.setattr(
        registration_email_service,
        "send_verification_email",
        fake_send,
    )

    user = asyncio.run(
        registration_email_service.register_and_send_verification(
            create_test_user()
        )
    )

    assert user["id"] == 1
    assert user["email"] == "usuario@example.com"


def test_registration_does_not_send_if_database_fails(monkeypatch):
    def fake_register(data):
        raise SQLAlchemyError("Error de PostgreSQL")

    async def fake_send(**kwargs):
        raise AssertionError("No debe enviar correos")

    monkeypatch.setattr(
        registration_email_service,
        "register_user_with_verification",
        fake_register,
    )

    monkeypatch.setattr(
        registration_email_service,
        "send_verification_email",
        fake_send,
    )

    with pytest.raises(SQLAlchemyError):
        asyncio.run(
            registration_email_service.register_and_send_verification(
                create_test_user()
            )
        )