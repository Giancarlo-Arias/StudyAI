import asyncio
import hashlib
import re
from types import SimpleNamespace

from app.core import security
from app.services import password_reset_service


def test_password_hashing():
    """Comprobar el hashing y la verificación de contraseñas."""

    password = "ClaveSeguraDePrueba2026!"

    password_hash = security.hash_password(password)

    assert password_hash != password
    assert security.verify_password(password, password_hash)
    assert not security.verify_password("OtraClave2026!", password_hash)


def test_email_verification_code(monkeypatch):
    """Comprobar que el código tiene seis dígitos y utiliza HMAC."""

    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: SimpleNamespace(
            email_verification_code_secret="a" * 32,
        ),
    )

    monkeypatch.setattr(
        security.secrets,
        "randbelow",
        lambda limit: 42,
    )

    code, code_hash = security.generate_email_verification_code(
        "usuario@ejemplo.com",
    )

    assert code == "000042"
    assert re.fullmatch(r"[0-9]{6}", code)
    assert len(code_hash) == 64

    assert code_hash == security.hash_email_verification_code(
        "usuario@ejemplo.com",
        code,
    )


def test_verification_code_is_email_specific(monkeypatch):
    """Un mismo código debe producir hashes distintos por correo."""

    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: SimpleNamespace(
            email_verification_code_secret="a" * 32,
        ),
    )

    code = "123456"

    first_hash = security.hash_email_verification_code(
        "primero@ejemplo.com",
        code,
    )

    second_hash = security.hash_email_verification_code(
        "segundo@ejemplo.com",
        code,
    )

    assert first_hash != second_hash


def test_password_reset_token():
    """Comprobar que se genera un token largo y su hash SHA-256."""

    token, token_hash = (
        password_reset_service.generate_password_reset_token()
    )

    assert re.fullmatch(r"[A-Za-z0-9_-]{43}", token)

    assert token_hash == hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


def test_forgot_password_unknown_email(monkeypatch):
    """No enviar un correo cuando el repositorio no encuentra la cuenta."""

    monkeypatch.setattr(
        password_reset_service,
        "save_password_reset_token",
        lambda email, token_hash: None,
    )

    async def fake_send_email(**kwargs):
        raise AssertionError("No debería enviarse un correo")

    monkeypatch.setattr(
        password_reset_service,
        "send_password_reset_email",
        fake_send_email,
    )

    result = asyncio.run(
        password_reset_service.request_password_reset(
            "noexiste@ejemplo.com",
            "http://localhost:3000/reset-password",
        )
    )

    assert result is False


def test_forgot_password_sends_email(monkeypatch):
    """Comprobar que el servicio prepara el correo correctamente."""

    saved = {}
    sent = {}

    def fake_save(email, token_hash):
        saved["email"] = email
        saved["token_hash"] = token_hash
        return email

    async def fake_send_email(**kwargs):
        sent.update(kwargs)

    monkeypatch.setattr(
        password_reset_service,
        "save_password_reset_token",
        fake_save,
    )

    monkeypatch.setattr(
        password_reset_service,
        "send_password_reset_email",
        fake_send_email,
    )

    monkeypatch.setattr(
        password_reset_service,
        "get_settings",
        lambda: SimpleNamespace(
            resend_api_key="test-api-key",
            resend_from_email="test@ejemplo.com",
        ),
    )

    result = asyncio.run(
        password_reset_service.request_password_reset(
            "usuario@ejemplo.com",
            "http://localhost:3000/reset-password",
        )
    )

    assert result is True
    assert saved["email"] == "usuario@ejemplo.com"
    assert sent["to_email"] == "usuario@ejemplo.com"
    assert sent["expires_in_minutes"] == 30

    assert saved["token_hash"] == hashlib.sha256(
        sent["token"].encode("utf-8")
    ).hexdigest()


def test_reset_password_rejects_invalid_token():
    """Rechazar un token cuyo formato sea incorrecto."""

    result = asyncio.run(
        password_reset_service.reset_user_password(
            "token-invalido",
            "ClaveNuevaSegura2026!",
        )
    )

    assert result is False


def test_reset_password_success(monkeypatch):
    """Comprobar que el servicio utiliza el token y la contraseña."""

    received = {}

    def fake_hash_password(password):
        return "hash-argon2id-de-prueba"

    def fake_consume_token(token_hash, password_hash):
        received["token_hash"] = token_hash
        received["password_hash"] = password_hash
        return True

    monkeypatch.setattr(
        password_reset_service,
        "hash_password",
        fake_hash_password,
    )

    monkeypatch.setattr(
        password_reset_service,
        "consume_password_reset_token",
        fake_consume_token,
    )

    token, expected_hash = (
        password_reset_service.generate_password_reset_token()
    )

    result = asyncio.run(
        password_reset_service.reset_user_password(
            token,
            "ClaveNuevaSegura2026!",
        )
    )

    assert result is True
    assert received["token_hash"] == expected_hash
    assert received["password_hash"] == "hash-argon2id-de-prueba"