import asyncio
from types import SimpleNamespace

import pytest

from app.services import email_verification_service


def test_resend_verification_email_success(monkeypatch):
    sent_emails = []

    monkeypatch.setattr(
        email_verification_service,
        "prepare_email_verification_resend",
        lambda email: "token-de-prueba",
    )

    monkeypatch.setattr(
        email_verification_service,
        "get_settings",
        lambda: SimpleNamespace(
            resend_api_key="re_test",
            resend_from_email="StudyAI <onboarding@resend.dev>",
            email_verification_url="http://localhost:5173/verify-email",
        ),
    )

    async def fake_send_verification_email(**kwargs):
        sent_emails.append(kwargs)

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_email",
        fake_send_verification_email,
    )

    result = asyncio.run(
        email_verification_service.resend_verification_email(
            "usuario@example.com"
        )
    )

    assert result is True
    assert len(sent_emails) == 1
    assert sent_emails[0]["to_email"] == "usuario@example.com"
    assert sent_emails[0]["token"] == "token-de-prueba"


def test_resend_verification_email_unknown_user(monkeypatch):
    monkeypatch.setattr(
        email_verification_service,
        "prepare_email_verification_resend",
        lambda email: None,
    )

    async def fake_send_verification_email(**kwargs):
        raise AssertionError("No debe enviar correos")

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_email",
        fake_send_verification_email,
    )

    result = asyncio.run(
        email_verification_service.resend_verification_email(
            "desconocido@example.com"
        )
    )

    assert result is False


def test_resend_verification_email_provider_error(monkeypatch):
    monkeypatch.setattr(
        email_verification_service,
        "prepare_email_verification_resend",
        lambda email: "token-de-prueba",
    )

    monkeypatch.setattr(
        email_verification_service,
        "get_settings",
        lambda: SimpleNamespace(
            resend_api_key="re_test",
            resend_from_email="StudyAI <onboarding@resend.dev>",
            email_verification_url="http://localhost:5173/verify-email",
        ),
    )

    async def fake_send_verification_email(**kwargs):
        raise RuntimeError("Resend no disponible")

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_email",
        fake_send_verification_email,
    )

    with pytest.raises(RuntimeError, match="Resend no disponible"):
        asyncio.run(
            email_verification_service.resend_verification_email(
                "usuario@example.com"
            )
        )