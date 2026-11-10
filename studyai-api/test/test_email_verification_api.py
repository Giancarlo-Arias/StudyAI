from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_legacy_verify_email_endpoint_removed():
    """El endpoint antiguo de verificación por enlace no debe existir."""

    response = client.post(
        "/api/v1/auth/verify-email",
        json={"token": "a" * 43},
    )

    assert response.status_code == 404