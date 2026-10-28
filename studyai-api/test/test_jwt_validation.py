from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt
import pytest

from app.core import jwt_tokens
from app.core.jwt_tokens import InvalidAccessTokenError


TEST_SECRET = "a" * 64


@pytest.fixture(autouse=True)
def configure_jwt(monkeypatch):
    monkeypatch.setattr(
        jwt_tokens,
        "get_settings",
        lambda: SimpleNamespace(
            jwt_secret_key=TEST_SECRET,
            jwt_access_token_expire_minutes=15,
        ),
    )


def make_token(**changes):
    now = datetime.now(timezone.utc)

    payload = {
        "sub": "1",
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=15),
    }

    payload.update(changes)

    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


def test_decode_valid_token():
    token = jwt_tokens.create_access_token(1)

    assert jwt_tokens.decode_access_token(token) == 1


def test_decode_expired_token():
    now = datetime.now(timezone.utc)

    token = make_token(
        iat=now - timedelta(minutes=20),
        exp=now - timedelta(minutes=1),
    )

    with pytest.raises(InvalidAccessTokenError):
        jwt_tokens.decode_access_token(token)


def test_decode_invalid_signature():
    token = jwt.encode(
        {
            "sub": "1",
            "type": "access",
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
        },
        "b" * 64,
        algorithm="HS256",
    )

    with pytest.raises(InvalidAccessTokenError):
        jwt_tokens.decode_access_token(token)


def test_decode_wrong_token_type():
    token = make_token(type="refresh")

    with pytest.raises(InvalidAccessTokenError):
        jwt_tokens.decode_access_token(token)


def test_decode_invalid_user_id():
    token = make_token(sub="usuario")

    with pytest.raises(InvalidAccessTokenError):
        jwt_tokens.decode_access_token(token)


def test_decode_missing_claim():
    now = datetime.now(timezone.utc)

    token = jwt.encode(
        {
            "sub": "1",
            "iat": now,
            "exp": now + timedelta(minutes=15),
        },
        TEST_SECRET,
        algorithm="HS256",
    )

    with pytest.raises(InvalidAccessTokenError):
        jwt_tokens.decode_access_token(token)