from datetime import datetime, timezone
from unittest.mock import Mock
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


# Prueba 1: Listar documentos correctamente
def test_list_documents(monkeypatch):
    document_id = uuid4()

    mock_list = Mock(return_value=[
        {
            "id": document_id,
            "filename": "ejemplo.pdf",
            "size_bytes": 17168,
            "pages_with_text": 1,
            "text_length": 38,
            "created_at": datetime.now(timezone.utc)
        }
    ])

    monkeypatch.setattr(
        "app.api.v1.routers.documents.list_documents",
        mock_list
    )

    response = client.get(
        "/api/v1/documents?limit=10&offset=0"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1
    assert data["documents"][0]["id"] == str(document_id)
    assert data["documents"][0]["filename"] == "ejemplo.pdf"

    mock_list.assert_called_once_with(limit=10, offset=0)


# Prueba 2: Rechazar un límite inválido
def test_list_documents_invalid_limit():
    response = client.get(
        "/api/v1/documents?limit=101"
    )

    assert response.status_code == 422