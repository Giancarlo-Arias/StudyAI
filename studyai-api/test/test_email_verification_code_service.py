import asyncio
from types import SimpleNamespace

import pytest

from app.services import email_verification_service


def test_verify_email_code_success(monkeypatch):
    """Verificar que el código correcto se envía al repositorio."""

    received = {}

    monkeypatch.setattr(
        email_verification_service,
        "hash_email_verification_code",
        lambda email, code: "hash-codigo-test",
    )

    def fake_verify(email, code_hash):
        received["email"] = email
        received["code_hash"] = code_hash
        return True

    monkeypatch.setattr(
        email_verification_service,
        "verify_email_verification_code",
        fake_verify,
    )

    result = email_verification_service.verify_user_email_code(
        "usuario@example.com",
        "004281",
    )

    assert result is True
    assert received["email"] == "usuario@example.com"
    assert received["code_hash"] == "hash-codigo-test"


def test_verify_email_code_invalid_format():
    """Rechazar códigos que no tengan exactamente seis dígitos."""

    assert not email_verification_service.verify_user_email_code(
        "usuario@example.com",
        "12345",
    )

    assert not email_verification_service.verify_user_email_code(
        "usuario@example.com",
        "ABC123",
    )


def test_verify_email_code_incorrect(monkeypatch):
    """Rechazar el código cuando PostgreSQL no lo valida."""

    monkeypatch.setattr(
        email_verification_service,
        "hash_email_verification_code",
        lambda email, code: "hash-codigo-incorrecto",
    )

    monkeypatch.setattr(
        email_verification_service,
        "verify_email_verification_code",
        lambda email, code_hash: False,
    )

    result = email_verification_service.verify_user_email_code(
        "usuario@example.com",
        "123456",
    )

    assert result is False


def test_resend_verification_code_success(monkeypatch):
    """Enviar el código generado mediante Resend."""

    sent = {}

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
            resend_from_email="StudyAI <verify@example.com>",
        ),
    )

    async def fake_send(**kwargs):
        sent.update(kwargs)

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_code_email",
        fake_send,
    )

    result = asyncio.run(
        email_verification_service.resend_verification_code_email(
            "usuario@example.com",
        )
    )

    assert result is True
    assert sent["to_email"] == "usuario@example.com"
    assert sent["code"] == "004281"


def test_resend_verification_code_blocked(monkeypatch):
    """No enviar otro correo cuando PostgreSQL rechaza el reenvío."""

    monkeypatch.setattr(
        email_verification_service,
        "prepare_email_verification_code_resend",
        lambda email: None,
    )

    async def fake_send(**kwargs):
        raise AssertionError("No debería enviarse el correo")

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_code_email",
        fake_send,
    )

    result = asyncio.run(
        email_verification_service.resend_verification_code_email(
            "usuario@example.com",
        )
    )

    assert result is False


def test_resend_verification_code_provider_error(monkeypatch):
    """Propagar el error del proveedor para que el endpoint lo gestione."""

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
            resend_from_email="StudyAI <verify@example.com>",
        ),
    )

    async def fake_send(**kwargs):
        raise RuntimeError("Proveedor no disponible")

    monkeypatch.setattr(
        email_verification_service,
        "send_verification_code_email",
        fake_send,
    )

    with pytest.raises(RuntimeError, match="Proveedor no disponible"):
        asyncio.run(
            email_verification_service.resend_verification_code_email(
                "usuario@example.com",
            )
        )