from unittest.mock import Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.routers import auth
from app.main import app
from app.services.auth_service import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
)


client = TestClient(app, client=("192.0.2.50", 50000))

URL = "/api/v1/auth/login"


def valid_login_data():
    return {
        "email": "usuario@example.com",
        "password": "StudyAI-Segura-2026!",
    }


@pytest.fixture(autouse=True)
def mock_dependencies(monkeypatch):
    monkeypatch.setattr(
        auth,
        "allow_auth_request",
        lambda ip, action: True,
    )

    monkeypatch.setattr(
        auth,
        "create_access_token",
        lambda user_id: "jwt-de-prueba",
    )


def test_login_success(monkeypatch):
    mock_authenticate = Mock(return_value={
        "id": 2,
        "email": "usuario@example.com",
    })

    monkeypatch.setattr(
        auth,
        "authenticate_user",
        mock_authenticate,
    )

    response = client.post(URL, json=valid_login_data())

    assert response.status_code == 200
    assert response.json() == {
        "access_token": "jwt-de-prueba",
        "token_type": "bearer",
    }

    mock_authenticate.assert_called_once_with(
        "usuario@example.com",
        "StudyAI-Segura-2026!",
    )


def test_login_invalid_credentials(monkeypatch):
    mock_authenticate = Mock(
        side_effect=InvalidCredentialsError()
    )

    monkeypatch.setattr(
        auth,
        "authenticate_user",
        mock_authenticate,
    )

    response = client.post(URL, json=valid_login_data())

    assert response.status_code == 401
    assert response.json()["detail"] == (
        "Correo o contraseña incorrectos"
    )
    assert response.headers["www-authenticate"] == "Bearer"


def test_login_unverified_email(monkeypatch):
    mock_authenticate = Mock(
        side_effect=EmailNotVerifiedError()
    )

    monkeypatch.setattr(
        auth,
        "authenticate_user",
        mock_authenticate,
    )

    response = client.post(URL, json=valid_login_data())

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "Debes verificar tu correo electrónico"
    )


def test_login_rate_limit(monkeypatch):
    monkeypatch.setattr(
        auth,
        "allow_auth_request",
        lambda ip, action: False,
    )

    mock_authenticate = Mock()

    monkeypatch.setattr(
        auth,
        "authenticate_user",
        mock_authenticate,
    )

    response = client.post(URL, json=valid_login_data())

    assert response.status_code == 429
    mock_authenticate.assert_not_called()


def test_login_invalid_email():
    response = client.post(
        URL,
        json={
            "email": "correo-invalido",
            "password": "StudyAI-Segura-2026!",
        },
    )

    assert response.status_code == 422


def test_login_database_error(monkeypatch):
    monkeypatch.setattr(
        auth,
        "authenticate_user",
        Mock(side_effect=SQLAlchemyError("Error simulado")),
    )

    response = client.post(URL, json=valid_login_data())

    assert response.status_code == 503


def test_login_rate_limit_database_error(monkeypatch):
    monkeypatch.setattr(
        auth,
        "allow_auth_request",
        Mock(side_effect=SQLAlchemyError("Error simulado")),
    )

    response = client.post(URL, json=valid_login_data())

    assert response.status_code == 503


def test_login_jwt_configuration_error(monkeypatch):
    monkeypatch.setattr(
        auth,
        "authenticate_user",
        Mock(return_value={
            "id": 2,
            "email": "usuario@example.com",
        }),
    )

    monkeypatch.setattr(
        auth,
        "create_access_token",
        Mock(side_effect=RuntimeError("Clave JWT inválida")),
    )

    response = client.post(URL, json=valid_login_data())

    assert response.status_code == 503
    assert "Clave JWT inválida" not in response.text