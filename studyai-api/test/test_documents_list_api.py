from datetime import datetime, timezone
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import documents
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def authenticated_user():
    """Simular un usuario autenticado para estas pruebas."""

    async def fake_current_user():
        return {
            "id": 2,
            "full_name": "Usuario Prueba",
            "email": "usuario@example.com",
        }

    app.dependency_overrides[get_current_user] = fake_current_user

    yield

    app.dependency_overrides.pop(get_current_user, None)


# Prueba 1: Listar documentos del usuario autenticado
def test_list_documents(monkeypatch):
    document_id = uuid4()

    mock_list = Mock(return_value=[
        {
            "id": document_id,
            "filename": "ejemplo.pdf",
            "size_bytes": 17168,
            "pages_with_text": 1,
            "text_length": 38,
            "created_at": datetime.now(timezone.utc),
        }
    ])

    monkeypatch.setattr(
        documents,
        "list_documents_for_user",
        mock_list,
    )

    response = client.get(
        "/api/v1/documents",
        params={"limit": 20, "offset": 0},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1
    assert data["limit"] == 20
    assert data["offset"] == 0
    assert data["documents"][0]["id"] == str(document_id)
    assert data["documents"][0]["filename"] == "ejemplo.pdf"

    mock_list.assert_called_once_with(2, 20, 0)


# Prueba 2: Rechazar paginación inválida
def test_list_documents_invalid_limit(monkeypatch):
    mock_list = Mock()

    monkeypatch.setattr(
        documents,
        "list_documents_for_user",
        mock_list,
    )

    response = client.get(
        "/api/v1/documents?limit=101"
    )

    assert response.status_code == 422
    mock_list.assert_not_called()