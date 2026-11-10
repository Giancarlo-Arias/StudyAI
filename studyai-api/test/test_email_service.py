import asyncio

import pytest

from app.services import email_service


def test_send_verification_email(monkeypatch):
    sent_emails = []

    async def fake_send(params):
        sent_emails.append(params)
        return {"id": "email-test"}

    monkeypatch.setattr(
        email_service.resend.Emails,
        "send_async",
        fake_send,
    )

    asyncio.run(
        email_service.send_verification_email(
            to_email="usuario@example.com",
            token="token-seguro-123",
            api_key="re_test",
            sender_email="StudyAI <verify@example.com>",
            verification_page_url="http://localhost:5173/verify-email",
        )
    )

    assert len(sent_emails) == 1

    email = sent_emails[0]

    assert email["to"] == ["usuario@example.com"]
    assert email["subject"] == "Verifica tu correo electrónico - StudyAI"
    assert (
        "http://localhost:5173/verify-email?token=token-seguro-123"
        in email["text"]
    )
    assert "5 minutos" in email["html"]


def test_send_verification_email_provider_error(monkeypatch):
    async def fake_send(params):
        raise RuntimeError("Proveedor no disponible")

    monkeypatch.setattr(
        email_service.resend.Emails,
        "send_async",
        fake_send,
    )

    with pytest.raises(RuntimeError, match="Proveedor no disponible"):
        asyncio.run(
            email_service.send_verification_email(
                to_email="usuario@example.com",
                token="token-seguro-123",
                api_key="re_test",
                sender_email="StudyAI <verify@example.com>",
                verification_page_url="http://localhost:5173/verify-email",
            )
        )


def test_build_verification_link_invalid_url():
    with pytest.raises(ValueError, match="URL de verificación inválida"):
        email_service.build_verification_link(
            "javascript:alert(1)",
            "token-seguro-123",
        )


# Comprobar el envío del correo de recuperación de contraseña.
def test_send_password_reset_email(monkeypatch):
    sent_emails = []

    async def fake_send(params):
        sent_emails.append(params)
        return {"id": "reset-email-test"}

    monkeypatch.setattr(
        email_service.resend.Emails,
        "send_async",
        fake_send,
    )

    asyncio.run(
        email_service.send_password_reset_email(
            to_email="usuario@example.com",
            token="token-recuperacion-123",
            api_key="re_test",
            sender_email="StudyAI <verify@example.com>",
            reset_page_url="http://localhost:3000/reset-password",
            expires_in_minutes=30,
        )
    )

    assert len(sent_emails) == 1

    email = sent_emails[0]

    assert email["to"] == ["usuario@example.com"]
    assert email["subject"] == "Recupera tu contraseña - StudyAI"

    assert (
        "http://localhost:3000/reset-password"
        "?token=token-recuperacion-123"
        in email["text"]
    )

    assert "30 minutos" in email["html"]
    assert "Restablecer contraseña" in email["html"]
    assert "solo puede utilizarse una vez" in email["text"]


# Verificar el manejo de errores del proveedor al recuperar contraseñas.
def test_send_password_reset_email_provider_error(monkeypatch):
    async def fake_send(params):
        raise RuntimeError("Proveedor no disponible")

    monkeypatch.setattr(
        email_service.resend.Emails,
        "send_async",
        fake_send,
    )

    with pytest.raises(RuntimeError, match="Proveedor no disponible"):
        asyncio.run(
            email_service.send_password_reset_email(
                to_email="usuario@example.com",
                token="token-recuperacion-123",
                api_key="re_test",
                sender_email="StudyAI <verify@example.com>",
                reset_page_url="http://localhost:3000/reset-password",
                expires_in_minutes=30,
            )
        )


# Rechazar direcciones inválidas para recuperar contraseñas.
def test_build_password_reset_link_invalid_url():
    with pytest.raises(ValueError, match="URL del enlace inválida"):
        email_service.build_password_reset_link(
            "javascript:alert(1)",
            "token-recuperacion-123",
        )



def test_send_verification_code_email(monkeypatch):
    """Comprobar el envío del código de verificación."""

    sent_emails = []

    async def fake_send(params):
        sent_emails.append(params)
        return {"id": "verification-code-test"}

    monkeypatch.setattr(
        email_service.resend.Emails,
        "send_async",
        fake_send,
    )

    asyncio.run(
        email_service.send_verification_code_email(
            to_email="usuario@example.com",
            code="004281",
            api_key="re_test",
            sender_email="StudyAI <verify@example.com>",
        )
    )

    assert len(sent_emails) == 1

    email = sent_emails[0]

    assert email["to"] == ["usuario@example.com"]
    assert email["subject"] == "Tu código de verificación - StudyAI"
    assert "004281" in email["text"]
    assert "004281" in email["html"]
    assert "5 minutos" in email["html"]


def test_send_verification_code_email_invalid_code():
    """Rechazar códigos que no tengan exactamente seis dígitos."""

    with pytest.raises(ValueError, match="Código de verificación inválido"):
        asyncio.run(
            email_service.send_verification_code_email(
                to_email="usuario@example.com",
                code="12345",
                api_key="re_test",
                sender_email="StudyAI <verify@example.com>",
            )
        )