from datetime import datetime, timezone
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.main import app
from app.repositories.user_repository import UserAlreadyExistsError


client = TestClient(app)


# Datos válidos para las pruebas
def valid_user_data():
    return {
        "full_name": "Giancarlo Arias",
        "email": "giancarlo@example.com",
        "password": "StudyAI-Segura-2026!"
    }


# Prueba 1: Registrar usuario correctamente
def test_register_user_success(monkeypatch):
    now = datetime.now(timezone.utc)

    mock_register = AsyncMock(return_value={
        "id": 1,
        "full_name": "Giancarlo Arias",
        "email": "giancarlo@example.com",
        "is_active": True,
        "email_verified_at": None,
        "created_at": now,
        "updated_at": now,
        "password_hash": "hash-no-debe-ser-publico"
    })

    monkeypatch.setattr(
        "app.api.v1.routers.auth.register_and_send_verification",
        mock_register
    )

    response = client.post(
        "/api/v1/auth/register",
        json=valid_user_data()
    )

    assert response.status_code == 201

    data = response.json()

    assert data["id"] == 1
    assert data["full_name"] == "Giancarlo Arias"
    assert data["email"] == "giancarlo@example.com"
    assert data["email_verified_at"] is None

    # Nunca devolver contraseñas ni hashes
    assert "password" not in data
    assert "password_hash" not in data

    mock_register.assert_awaited_once()


# Prueba 2: Rechazar correo duplicado
def test_register_duplicate_email(monkeypatch):
    mock_register = AsyncMock(
        side_effect=UserAlreadyExistsError(
            "Ya existe una cuenta con ese correo"
        )
    )

    monkeypatch.setattr(
        "app.api.v1.routers.auth.register_and_send_verification",
        mock_register
    )

    response = client.post(
        "/api/v1/auth/register",
        json=valid_user_data()
    )

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Ya existe una cuenta con ese correo"
    )

    mock_register.assert_awaited_once()


# Prueba 3: Rechazar datos inválidos
def test_register_invalid_data(monkeypatch):
    mock_register = AsyncMock()

    monkeypatch.setattr(
        "app.api.v1.routers.auth.register_and_send_verification",
        mock_register
    )

    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "A",
            "email": "correo-invalido",
            "password": "123"
        }
    )

    assert response.status_code == 422

    # Los datos inválidos no deben llegar al servicio
    mock_register.assert_not_awaited()


# Prueba 4: Manejar errores de PostgreSQL
def test_register_database_error(monkeypatch):
    mock_register = AsyncMock(
        side_effect=SQLAlchemyError("Error interno de prueba")
    )

    monkeypatch.setattr(
        "app.api.v1.routers.auth.register_and_send_verification",
        mock_register
    )

    response = client.post(
        "/api/v1/auth/register",
        json=valid_user_data()
    )

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Error interno al registrar el usuario"
    )

    mock_register.assert_awaited_once()