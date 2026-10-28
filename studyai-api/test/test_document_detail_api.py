from datetime import datetime, timezone
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import documents
from app.main import app


client = TestClient(app)


# Simular un usuario autenticado para las pruebas
@pytest.fixture
def authenticated_user():
    async def fake_current_user():
        return {
            "id": 2,
            "full_name": "Usuario Prueba",
            "email": "usuario@example.com",
        }

    previous_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = fake_current_user

    yield

    if previous_override is None:
        app.dependency_overrides.pop(get_current_user, None)
    else:
        app.dependency_overrides[get_current_user] = previous_override


# Prueba 1: Consultar un documento existente del usuario autenticado
def test_get_document_by_id(monkeypatch, authenticated_user):
    document_id = uuid4()
    chunk_id = uuid4()

    mock_get = Mock(return_value={
        "document": {
            "id": document_id,
            "filename": "ejemplo.pdf",
            "size_bytes": 17168,
            "pages_with_text": 1,
            "text_length": 38,
            "created_at": datetime.now(timezone.utc)
        },
        "chunks": [
            {
                "id": chunk_id,
                "page_number": 1,
                "chunk_index": 1,
                "text": "Python es un lenguaje de programación."
            }
        ],
        "chunk_count": 1,
        "limit": 20,
        "offset": 0
    })

    # Simular la consulta sin tocar PostgreSQL
    monkeypatch.setattr(
        documents,
        "get_document_with_chunks_for_user",
        mock_get
    )

    response = client.get(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["document"]["id"] == str(document_id)
    assert data["document"]["filename"] == "ejemplo.pdf"
    assert data["chunk_count"] == 1
    assert data["chunks"][0]["text"] == (
        "Python es un lenguaje de programación."
    )

    # Verificar que se utilizó el ID del usuario autenticado
    mock_get.assert_called_once_with(document_id, 2, 20, 0)


# Prueba 2: Documento inexistente o perteneciente a otro usuario
def test_get_document_not_found(monkeypatch, authenticated_user):
    document_id = uuid4()

    mock_get = Mock(return_value=None)

    monkeypatch.setattr(
        documents,
        "get_document_with_chunks_for_user",
        mock_get
    )

    response = client.get(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Documento no encontrado"

    mock_get.assert_called_once_with(document_id, 2, 20, 0)


# Prueba 3: UUID inválido
def test_get_document_invalid_uuid(authenticated_user):
    response = client.get(
        "/api/v1/documents/esto-no-es-un-uuid"
    )

    assert response.status_code == 422


# Prueba 4: Rechazar consultas sin autenticación
def test_get_document_requires_authentication(monkeypatch):
    mock_get = Mock()

    monkeypatch.setattr(
        documents,
        "get_document_with_chunks_for_user",
        mock_get
    )

    response = client.get(
        f"/api/v1/documents/{uuid4()}"
    )

    assert response.status_code == 401

    # No debe consultar PostgreSQL sin autenticación
    mock_get.assert_not_called()


# Prueba 5: Manejar errores de PostgreSQL
def test_get_document_database_error(monkeypatch, authenticated_user):
    document_id = uuid4()

    mock_get = Mock(
        side_effect=SQLAlchemyError("Error interno de prueba")
    )

    monkeypatch.setattr(
        documents,
        "get_document_with_chunks_for_user",
        mock_get
    )

    response = client.get(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Error interno al consultar el documento"
    )

    mock_get.assert_called_once_with(document_id, 2, 20, 0)