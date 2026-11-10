import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.routers import auth as auth_module


@pytest.fixture
def client(monkeypatch):
    """Crear una API de prueba sin utilizar servicios externos."""

    monkeypatch.setattr(
        auth_module,
        "allow_auth_request",
        lambda client_ip, action: True,
    )

    app = FastAPI()
    app.include_router(auth_module.router, prefix="/api/v1")

    return TestClient(app)


def test_verify_email_code_success(client, monkeypatch):
    """Verificar el correo cuando el código es correcto."""

    received = {}

    def fake_verify(email, code):
        received["email"] = email
        received["code"] = code
        return True

    monkeypatch.setattr(
        auth_module,
        "verify_user_email_code",
        fake_verify,
    )

    response = client.post(
        "/api/v1/auth/verify-email-code",
        json={
            "email": "usuario@example.com",
            "code": "004281",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Correo verificado correctamente"
    }
    assert received["email"] == "usuario@example.com"
    assert received["code"] == "004281"


def test_verify_email_code_incorrect(client, monkeypatch):
    """Rechazar un código incorrecto."""

    monkeypatch.setattr(
        auth_module,
        "verify_user_email_code",
        lambda email, code: False,
    )

    response = client.post(
        "/api/v1/auth/verify-email-code",
        json={
            "email": "usuario@example.com",
            "code": "123456",
        },
    )

    assert response.status_code == 400


def test_verify_email_code_invalid_format(client):
    """Rechazar un código que no tenga seis dígitos."""

    response = client.post(
        "/api/v1/auth/verify-email-code",
        json={
            "email": "usuario@example.com",
            "code": "ABC123",
        },
    )

    assert response.status_code == 422


def test_verify_email_code_rate_limit(client, monkeypatch):
    """Bloquear solicitudes cuando se supera el límite por IP."""

    monkeypatch.setattr(
        auth_module,
        "allow_auth_request",
        lambda client_ip, action: False,
    )

    response = client.post(
        "/api/v1/auth/verify-email-code",
        json={
            "email": "usuario@example.com",
            "code": "004281",
        },
    )

    assert response.status_code == 429


def test_verify_email_code_database_error(client, monkeypatch):
    """Devolver 503 si PostgreSQL no está disponible."""

    def fake_verify(email, code):
        raise SQLAlchemyError("Error de prueba")

    monkeypatch.setattr(
        auth_module,
        "verify_user_email_code",
        fake_verify,
    )

    response = client.post(
        "/api/v1/auth/verify-email-code",
        json={
            "email": "usuario@example.com",
            "code": "004281",
        },
    )

    assert response.status_code == 503


def test_resend_verification_code_success(client, monkeypatch):
    """Procesar la solicitud de reenvío."""

    received = {}

    async def fake_resend(email):
        received["email"] = email
        return True

    monkeypatch.setattr(
        auth_module,
        "resend_verification_code_email",
        fake_resend,
    )

    response = client.post(
        "/api/v1/auth/resend-verification-code",
        json={"email": "usuario@example.com"},
    )

    assert response.status_code == 200
    assert received["email"] == "usuario@example.com"


def test_resend_verification_code_unknown_user(client, monkeypatch):
    """No revelar si el correo existe o no puede recibir otro código."""

    async def fake_resend(email):
        return False

    monkeypatch.setattr(
        auth_module,
        "resend_verification_code_email",
        fake_resend,
    )

    response = client.post(
        "/api/v1/auth/resend-verification-code",
        json={"email": "noexiste@example.com"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": (
            "Si la cuenta está pendiente de verificación, "
            "recibirás un código por correo electrónico"
        )
    }


def test_resend_verification_code_rate_limit(client, monkeypatch):
    """Bloquear el reenvío cuando se alcanza el límite por IP."""

    monkeypatch.setattr(
        auth_module,
        "allow_auth_request",
        lambda client_ip, action: False,
    )

    response = client.post(
        "/api/v1/auth/resend-verification-code",
        json={"email": "usuario@example.com"},
    )

    assert response.status_code == 429


def test_resend_verification_code_provider_error(client, monkeypatch):
    """No revelar errores del proveedor ni información sobre la cuenta."""

    async def fake_resend(email):
        raise httpx.ConnectError("Proveedor no disponible")

    monkeypatch.setattr(
        auth_module,
        "resend_verification_code_email",
        fake_resend,
    )

    response = client.post(
        "/api/v1/auth/resend-verification-code",
        json={"email": "usuario@example.com"},
    )

    assert response.status_code == 200
    assert "recibirás un código" in response.json()["message"]