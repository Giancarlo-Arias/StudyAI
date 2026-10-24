from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.routers import auth
from app.core.security import generate_email_verification_token
from app.main import app


client = TestClient(app)


def test_verify_email_success(monkeypatch):
    token, _ = generate_email_verification_token()

    def fake_verify(token_value):
        assert token_value == token
        return True

    monkeypatch.setattr(auth, "verify_user_email", fake_verify)

    response = client.post(
        "/api/v1/auth/verify-email",
        json={"token": token},
    )

    assert response.status_code == 200
    assert response.json() == {
        "message": "Correo verificado correctamente"
    }


def test_verify_email_invalid_token(monkeypatch):
    token, _ = generate_email_verification_token()

    monkeypatch.setattr(
        auth,
        "verify_user_email",
        lambda token_value: False,
    )

    response = client.post(
        "/api/v1/auth/verify-email",
        json={"token": token},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == (
        "Token inválido, vencido o utilizado"
    )


def test_verify_email_missing_token():
    response = client.post(
        "/api/v1/auth/verify-email",
        json={},
    )

    assert response.status_code == 422


def test_verify_email_database_error(monkeypatch):
    token, _ = generate_email_verification_token()

    def fake_verify(token_value):
        raise SQLAlchemyError("Error simulado")

    monkeypatch.setattr(auth, "verify_user_email", fake_verify)

    response = client.post(
        "/api/v1/auth/verify-email",
        json={"token": token},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Error interno al verificar el correo"
    )