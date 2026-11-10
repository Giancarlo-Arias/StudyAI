import re
from types import SimpleNamespace

from app.core import security


def test_generate_email_verification_code(monkeypatch):
    """Comprobar que se genera un código de seis dígitos y su HMAC."""

    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: SimpleNamespace(
            email_verification_code_secret="a" * 32,
        ),
    )

    # Generar un código conocido para comprobar su formato.
    monkeypatch.setattr(
        security.secrets,
        "randbelow",
        lambda limit: 42,
    )

    email = "usuario@example.com"

    code, code_hash = security.generate_email_verification_code(email)

    assert code == "000042"
    assert re.fullmatch(r"[0-9]{6}", code)

    # El hash debe ser HMAC-SHA256 de 64 caracteres.
    assert len(code_hash) == 64

    assert code_hash == security.hash_email_verification_code(
        email,
        code,
    )

    # Nunca guardar el código original como hash.
    assert code != code_hash


def test_generate_email_verification_code_unique(monkeypatch):
    """Comprobar que distintos códigos generan hashes diferentes."""

    monkeypatch.setattr(
        security,
        "get_settings",
        lambda: SimpleNamespace(
            email_verification_code_secret="a" * 32,
        ),
    )

    # Simular dos valores diferentes sin depender del azar.
    codes = iter([123456, 654321])

    monkeypatch.setattr(
        security.secrets,
        "randbelow",
        lambda limit: next(codes),
    )

    email = "usuario@example.com"

    code_1, hash_1 = security.generate_email_verification_code(email)
    code_2, hash_2 = security.generate_email_verification_code(email)

    assert code_1 == "123456"
    assert code_2 == "654321"

    assert code_1 != code_2
    assert hash_1 != hash_2