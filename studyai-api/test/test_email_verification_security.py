from app.core.security import (
    generate_email_verification_token,
    hash_email_verification_token,
)


def test_generate_email_verification_token():
    token, token_hash = generate_email_verification_token()

    assert len(token) >= 40
    assert len(token_hash) == 64
    assert token_hash == hash_email_verification_token(token)
    assert token != token_hash


def test_generate_email_verification_token_unique():
    token_1, _ = generate_email_verification_token()
    token_2, _ = generate_email_verification_token()

    assert token_1 != token_2