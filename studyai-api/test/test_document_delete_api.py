from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

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


# Prueba 1: Eliminar un documento propio
def test_delete_document(monkeypatch):
    document_id = uuid4()
    mock_delete = Mock(return_value=True)

    monkeypatch.setattr(
        documents,
        "delete_document_for_user",
        mock_delete,
    )

    response = client.delete(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 204
    assert response.content == b""

    mock_delete.assert_called_once_with(document_id, 2)


# Prueba 2: Documento inexistente o ajeno
def test_delete_document_not_found(monkeypatch):
    document_id = uuid4()
    mock_delete = Mock(return_value=False)

    monkeypatch.setattr(
        documents,
        "delete_document_for_user",
        mock_delete,
    )

    response = client.delete(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Documento no encontrado"

    mock_delete.assert_called_once_with(document_id, 2)


# Prueba 3: UUID inválido
def test_delete_document_invalid_uuid():
    response = client.delete(
        "/api/v1/documents/uuid-invalido"
    )

    assert response.status_code == 422


# Prueba 4: Error de PostgreSQL
def test_delete_document_database_error(monkeypatch):
    document_id = uuid4()

    mock_delete = Mock(
        side_effect=SQLAlchemyError("Error interno de prueba")
    )

    monkeypatch.setattr(
        documents,
        "delete_document_for_user",
        mock_delete,
    )

    response = client.delete(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Error interno al eliminar el documento"
    )

    mock_delete.assert_called_once_with(document_id, 2)