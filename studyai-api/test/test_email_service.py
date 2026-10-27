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