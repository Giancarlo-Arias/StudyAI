from datetime import datetime, timezone

import pytest

from app.core.security import hash_password
from app.services import auth_service
from app.services.auth_service import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
)


@pytest.fixture(scope="module")
def valid_user():
    return {
        "id": 1,
        "email": "usuario@example.com",
        "password_hash": hash_password("StudyAI-Segura-2026!"),
        "is_active": True,
        "email_verified_at": datetime.now(timezone.utc),
    }


def test_authenticate_user_success(monkeypatch, valid_user):
    monkeypatch.setattr(
        auth_service,
        "get_user_for_authentication",
        lambda email: valid_user,
    )

    result = auth_service.authenticate_user(
        "usuario@example.com",
        "StudyAI-Segura-2026!",
    )

    assert result == {
        "id": 1,
        "email": "usuario@example.com",
    }
    assert "password_hash" not in result


def test_authenticate_wrong_password(monkeypatch, valid_user):
    monkeypatch.setattr(
        auth_service,
        "get_user_for_authentication",
        lambda email: valid_user,
    )

    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate_user(
            "usuario@example.com",
            "Password-Incorrecta",
        )


def test_authenticate_unknown_user(monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "get_user_for_authentication",
        lambda email: None,
    )

    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate_user(
            "desconocido@example.com",
            "StudyAI-Segura-2026!",
        )


def test_authenticate_inactive_user(monkeypatch, valid_user):
    inactive_user = {
        **valid_user,
        "is_active": False,
    }

    monkeypatch.setattr(
        auth_service,
        "get_user_for_authentication",
        lambda email: inactive_user,
    )

    with pytest.raises(InvalidCredentialsError):
        auth_service.authenticate_user(
            "usuario@example.com",
            "StudyAI-Segura-2026!",
        )


def test_authenticate_unverified_user(monkeypatch, valid_user):
    unverified_user = {
        **valid_user,
        "email_verified_at": None,
    }

    monkeypatch.setattr(
        auth_service,
        "get_user_for_authentication",
        lambda email: unverified_user,
    )

    with pytest.raises(EmailNotVerifiedError):
        auth_service.authenticate_user(
            "usuario@example.com",
            "StudyAI-Segura-2026!",
        )