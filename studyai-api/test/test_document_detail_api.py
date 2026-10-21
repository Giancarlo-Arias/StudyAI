from datetime import datetime, timezone
from unittest.mock import Mock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# Prueba 1: Consultar un documento existente
def test_get_document_by_id(monkeypatch):
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
        "app.api.v1.routers.documents.get_document_by_id",
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

    mock_get.assert_called_once_with(document_id, 20, 0)


# Prueba 2: Documento inexistente
def test_get_document_not_found(monkeypatch):
    document_id = uuid4()

    monkeypatch.setattr(
        "app.api.v1.routers.documents.get_document_by_id",
        Mock(return_value=None)
    )

    response = client.get(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Documento no encontrado"


# Prueba 3: UUID inválido
def test_get_document_invalid_uuid():
    response = client.get(
        "/api/v1/documents/esto-no-es-un-uuid"
    )

    assert response.status_code == 422