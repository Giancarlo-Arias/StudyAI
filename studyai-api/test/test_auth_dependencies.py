from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Annotated
from unittest.mock import Mock

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1 import dependencies as auth_dependencies
from app.core import jwt_tokens


TEST_SECRET = "a" * 64

protected_app = FastAPI()


@protected_app.get("/protected")
async def protected_route(
    user: Annotated[
        dict,
        Depends(auth_dependencies.get_current_user),
    ],
):
    return user


client = TestClient(protected_app)


@pytest.fixture(autouse=True)
def configure_jwt(monkeypatch):
    """Usar una clave de prueba, nunca la clave real."""

    monkeypatch.setattr(
        jwt_tokens,
        "get_settings",
        lambda: SimpleNamespace(
            jwt_secret_key=TEST_SECRET,
            jwt_access_token_expire_minutes=15,
        ),
    )


def test_current_user_success(monkeypatch):
    mock_user = Mock(return_value={
        "id": 7,
        "full_name": "Usuario Prueba",
        "email": "usuario@example.com",
    })

    monkeypatch.setattr(
        auth_dependencies,
        "get_user_for_access",
        mock_user,
    )

    token = jwt_tokens.create_access_token(7)

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["id"] == 7
    assert response.json()["email"] == "usuario@example.com"
    mock_user.assert_called_once_with(7)


def test_current_user_missing_token():
    response = client.get("/protected")

    assert response.status_code == 401
    assert response.json()["detail"] == "No autenticado"


def test_current_user_wrong_auth_scheme():
    response = client.get(
        "/protected",
        headers={"Authorization": "Basic abc123"},
    )

    assert response.status_code == 401


def test_current_user_invalid_signature():
    now = datetime.now(timezone.utc)

    token = jwt.encode(
        {
            "sub": "7",
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=15),
        },
        "b" * 64,
        algorithm="HS256",
    )

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_current_user_expired_token():
    now = datetime.now(timezone.utc)

    token = jwt.encode(
        {
            "sub": "7",
            "type": "access",
            "iat": now - timedelta(minutes=20),
            "exp": now - timedelta(minutes=1),
        },
        TEST_SECRET,
        algorithm="HS256",
    )

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401


def test_current_user_no_longer_authorized(monkeypatch):
    monkeypatch.setattr(
        auth_dependencies,
        "get_user_for_access",
        lambda user_id: None,
    )

    token = jwt_tokens.create_access_token(7)

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "No autenticado"


def test_current_user_database_error(monkeypatch):
    monkeypatch.setattr(
        auth_dependencies,
        "get_user_for_access",
        Mock(side_effect=SQLAlchemyError("Error simulado")),
    )

    token = jwt_tokens.create_access_token(7)

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Servicio temporalmente no disponible"
    )