import httpx
import pytest

from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.routers import auth
from app.main import app


client = TestClient(
    app,
    client=("192.0.2.50", 50000),
)

URL = "/api/v1/auth/resend-verification"


@pytest.mark.parametrize("send_result", [True, False])
def test_resend_returns_generic_response(monkeypatch, send_result):
    received = {}

    def fake_rate_limit(ip, action):
        received["ip"] = ip
        received["action"] = action
        return True

    async def fake_resend(email):
        received["email"] = email
        return send_result

    monkeypatch.setattr(auth, "allow_auth_request", fake_rate_limit)
    monkeypatch.setattr(auth, "resend_verification_email", fake_resend)

    response = client.post(
        URL,
        json={"email": "usuario@example.com"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": (
            "Si la cuenta está pendiente de verificación, "
            "recibirás un correo con instrucciones"
        )
    }

    assert received == {
        "ip": "192.0.2.50",
        "action": "resend_verification",
        "email": "usuario@example.com",
    }


def test_resend_rate_limit_exceeded(monkeypatch):
    monkeypatch.setattr(
        auth,
        "allow_auth_request",
        lambda ip, action: False,
    )

    async def fake_resend(email):
        raise AssertionError("No debe enviar el correo")

    monkeypatch.setattr(
        auth,
        "resend_verification_email",
        fake_resend,
    )

    response = client.post(
        URL,
        json={"email": "usuario@example.com"},
    )

    assert response.status_code == 429


def test_resend_invalid_email():
    response = client.post(
        URL,
        json={"email": "correo-invalido"},
    )

    assert response.status_code == 422


def test_resend_database_error(monkeypatch):
    def fake_rate_limit(ip, action):
        raise SQLAlchemyError("Error simulado")

    monkeypatch.setattr(
        auth,
        "allow_auth_request",
        fake_rate_limit,
    )

    response = client.post(
        URL,
        json={"email": "usuario@example.com"},
    )

    assert response.status_code == 503


def test_resend_provider_error(monkeypatch):
    monkeypatch.setattr(
        auth,
        "allow_auth_request",
        lambda ip, action: True,
    )

    async def fake_resend(email):
        raise httpx.ConnectError("Proveedor no disponible")

    monkeypatch.setattr(
        auth,
        "resend_verification_email",
        fake_resend,
    )

    response = client.post(
        URL,
        json={"email": "usuario@example.com"},
    )

    assert response.status_code == 200
    assert "usuario@example.com" not in response.text