from unittest.mock import Mock
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.main import app


client = TestClient(app)


# Prueba 1: Eliminar un documento existente
def test_delete_document(monkeypatch):
    document_id = uuid4()
    mock_delete = Mock(return_value=True)

    monkeypatch.setattr(
        "app.api.v1.routers.documents.delete_document",
        mock_delete
    )

    response = client.delete(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 204
    assert response.content == b""

    mock_delete.assert_called_once_with(document_id)


# Prueba 2: Documento inexistente
def test_delete_document_not_found(monkeypatch):
    document_id = uuid4()

    monkeypatch.setattr(
        "app.api.v1.routers.documents.delete_document",
        Mock(return_value=False)
    )

    response = client.delete(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Documento no encontrado"


# Prueba 3: UUID inválido
def test_delete_document_invalid_uuid():
    response = client.delete(
        "/api/v1/documents/uuid-invalido"
    )

    assert response.status_code == 422


# Prueba 4: Error de PostgreSQL
def test_delete_document_database_error(monkeypatch):
    document_id = uuid4()

    monkeypatch.setattr(
        "app.api.v1.routers.documents.delete_document",
        Mock(side_effect=SQLAlchemyError("Error interno de prueba"))
    )

    response = client.delete(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Error interno al eliminar el documento"
    )