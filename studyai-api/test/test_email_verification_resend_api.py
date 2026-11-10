from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_legacy_resend_verification_endpoint_removed():
    """El endpoint antiguo de reenvío por enlace no debe existir."""

    response = client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "usuario@example.com"},
    )

    assert response.status_code == 404