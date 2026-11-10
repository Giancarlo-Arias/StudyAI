import asyncio
from types import SimpleNamespace

import pytest

from app.services import email_verification_service


def test_resend_verification_code_email_success(monkeypatch):
    """Enviar el código mediante Resend."""

    sent_emails = []

    monkeypatch.setattr(
        email_verification_service,
        "prepare_email_verification_code_resend",
        lambda email: "004281",
    )

    monkeypatch.setattr(
        email_verification_service,
        "get_settings",
        lambda: SimpleNamespace(
            resend_api_key="re_test",
            resend_from_email="StudyAI <onboarding@resend.dev>",
        ),
    )

    async def fake_send_verification_code_email(**kwargs):
        sent_emails.append(kwargs)

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_code_email",
        fake_send_verification_code_email,
    )

    result = asyncio.run(
        email_verification_service.resend_verification_code_email(
            "usuario@example.com"
        )
    )

    assert result is True
    assert len(sent_emails) == 1
    assert sent_emails[0]["to_email"] == "usuario@example.com"
    assert sent_emails[0]["code"] == "004281"
    assert sent_emails[0]["api_key"] == "re_test"


def test_resend_verification_code_email_unknown_user(monkeypatch):
    """No enviar un correo si el reenvío no está permitido."""

    monkeypatch.setattr(
        email_verification_service,
        "prepare_email_verification_code_resend",
        lambda email: None,
    )

    async def fake_send_verification_code_email(**kwargs):
        raise AssertionError("No debe enviar correos")

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_code_email",
        fake_send_verification_code_email,
    )

    result = asyncio.run(
        email_verification_service.resend_verification_code_email(
            "desconocido@example.com"
        )
    )

    assert result is False


def test_resend_verification_code_email_provider_error(monkeypatch):
    """Propagar los errores de envío para que el endpoint los gestione."""

    monkeypatch.setattr(
        email_verification_service,
        "prepare_email_verification_code_resend",
        lambda email: "004281",
    )

    monkeypatch.setattr(
        email_verification_service,
        "get_settings",
        lambda: SimpleNamespace(
            resend_api_key="re_test",
            resend_from_email="StudyAI <onboarding@resend.dev>",
        ),
    )

    async def fake_send_verification_code_email(**kwargs):
        raise RuntimeError("Resend no disponible")

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_code_email",
        fake_send_verification_code_email,
    )

    with pytest.raises(RuntimeError, match="Resend no disponible"):
        asyncio.run(
            email_verification_service.resend_verification_code_email(
                "usuario@example.com"
            )
        )