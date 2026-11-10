from app.services import email_verification_service


def test_prepare_verification_code_success(monkeypatch):
    """Generar un código y guardar solamente su hash."""

    received = {}

    monkeypatch.setattr(
        email_verification_service,
        "generate_email_verification_code",
        lambda email: ("004281", "hash-hmac-test"),
    )

    def fake_replace(email, code_hash):
        received["email"] = email
        received["code_hash"] = code_hash
        return True

    monkeypatch.setattr(
        email_verification_service,
        "replace_email_verification_token_for_unverified_user",
        fake_replace,
    )

    code = email_verification_service.prepare_email_verification_code_resend(
        "usuario@example.com"
    )

    assert code == "004281"
    assert received["email"] == "usuario@example.com"
    assert received["code_hash"] == "hash-hmac-test"


def test_prepare_verification_code_blocked(monkeypatch):
    """No devolver un código si PostgreSQL rechaza el reenvío."""

    monkeypatch.setattr(
        email_verification_service,
        "generate_email_verification_code",
        lambda email: ("004281", "hash-hmac-test"),
    )

    monkeypatch.setattr(
        email_verification_service,
        "replace_email_verification_token_for_unverified_user",
        lambda email, code_hash: False,
    )

    code = email_verification_service.prepare_email_verification_code_resend(
        "usuario@example.com"
    )

    assert code is None


def test_verify_email_code_invalid_format_does_not_query_database(monkeypatch):
    """Rechazar códigos inválidos antes de consultar PostgreSQL."""

    def fake_verify(email, code_hash):
        raise AssertionError("No debe consultar PostgreSQL")

    monkeypatch.setattr(
        email_verification_service,
        "verify_email_verification_code",
        fake_verify,
    )

    assert email_verification_service.verify_user_email_code(
        "usuario@example.com",
        "ABC123",
    ) is False

    assert email_verification_service.verify_user_email_code(
        "usuario@example.com",
        "12345",
    ) is False