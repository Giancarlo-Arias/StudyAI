from types import SimpleNamespace

import jwt
import pytest

from app.core import jwt_tokens


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


def test_create_access_token():
    token = jwt_tokens.create_access_token(1)

    payload = jwt.decode(
        token,
        TEST_SECRET,
        algorithms=["HS256"],
        options={"require": ["sub", "iat", "exp", "type"]},
    )

    assert payload["sub"] == "1"
    assert payload["type"] == "access"
    assert payload["exp"] - payload["iat"] == 900


def test_token_rejects_wrong_secret():
    token = jwt_tokens.create_access_token(1)

    with pytest.raises(jwt.InvalidSignatureError):
        jwt.decode(
            token,
            "b" * 64,
            algorithms=["HS256"],
        )


def test_token_requires_secret(monkeypatch):
    monkeypatch.setattr(
        jwt_tokens,
        "get_settings",
        lambda: SimpleNamespace(
            jwt_secret_key="",
            jwt_access_token_expire_minutes=15,
        ),
    )

    with pytest.raises(RuntimeError):
        jwt_tokens.create_access_token(1)


def test_token_rejects_invalid_user_id():
    with pytest.raises(ValueError):
        jwt_tokens.create_access_token(0)