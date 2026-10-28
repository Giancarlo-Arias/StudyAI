import pytest
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.main import app


client = TestClient(app)
URL = "/api/v1/auth/me"


@pytest.fixture
def override_current_user():
    """Sustituir temporalmente la autenticación."""

    def configure(user):
        async def fake_current_user():
            return user

        app.dependency_overrides[get_current_user] = fake_current_user

    yield configure

    app.dependency_overrides.pop(get_current_user, None)


def test_me_success(override_current_user):
    override_current_user({
        "id": 7,
        "full_name": "Usuario Prueba",
        "email": "usuario@example.com",
        "password_hash": "no-debe-ser-publico",
    })

    response = client.get(URL)

    assert response.status_code == 200
    assert response.json() == {
        "id": 7,
        "full_name": "Usuario Prueba",
        "email": "usuario@example.com",
    }

    assert "password_hash" not in response.json()


def test_me_missing_token():
    response = client.get(URL)

    assert response.status_code == 401
    assert response.json()["detail"] == "No autenticado"


def test_me_invalid_token():
    response = client.get(
        URL,
        headers={"Authorization": "Bearer token-invalido"},
    )

    assert response.status_code == 401