from app.core.security import (
    generate_email_verification_token,
    hash_email_verification_token,
)
from app.services import email_verification_service


def test_verify_user_email_valid(monkeypatch):
    token, expected_hash = generate_email_verification_token()

    received_hashes = []

    def fake_verify_token(token_hash):
        received_hashes.append(token_hash)
        return True

    monkeypatch.setattr(
        email_verification_service,
        "verify_email_verification_token",
        fake_verify_token,
    )

    result = email_verification_service.verify_user_email(token)

    assert result is True
    assert received_hashes == [expected_hash]


def test_verify_user_email_expired(monkeypatch):
    token, _ = generate_email_verification_token()

    monkeypatch.setattr(
        email_verification_service,
        "verify_email_verification_token",
        lambda token_hash: False,
    )

    assert email_verification_service.verify_user_email(token) is False


def test_verify_user_email_invalid_format(monkeypatch):
    def fake_verify_token(token_hash):
        raise AssertionError("No debe consultar PostgreSQL")

    monkeypatch.setattr(
        email_verification_service,
        "verify_email_verification_token",
        fake_verify_token,
    )

    assert email_verification_service.verify_user_email("invalid") is False