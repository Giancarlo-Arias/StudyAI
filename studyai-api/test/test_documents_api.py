from pathlib import Path
from unittest.mock import Mock
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.main import app


# Cliente de pruebas
client = TestClient(app)

# PDF utilizado para pruebas
PDF_PATH = Path(__file__).parent / "fixtures" / "ejemplo.pdf"


# Prueba 1: Procesar PDF y llamar al repositorio
def test_upload_pdf_generates_chunks(monkeypatch):
    content = PDF_PATH.read_bytes()
    document_id = uuid4()

    # Simular el guardado para no modificar la base real
    mock_save = Mock(return_value=document_id)

    monkeypatch.setattr(
        "app.api.v1.routers.documents.save_document",
        mock_save
    )

    response = client.post(
        "/api/v1/documents/upload",
        files={
            "file": (
                "ejemplo.pdf",
                content,
                "application/pdf"
            )
        }
    )

    assert response.status_code == 200

    data = response.json()

    assert data["document_id"] == str(document_id)
    assert data["filename"] == "ejemplo.pdf"
    assert data["size_bytes"] == len(content)
    assert data["pages_with_text"] == 1
    assert data["chunk_count"] >= 1
    assert data["text_length"] >= len(
        "Python es un lenguaje de programación"
    )

    # Comprobar que la API llamó al repositorio
    mock_save.assert_called_once()

    # Verificar el documento entregado al repositorio
    processed_document = mock_save.call_args.args[0]

    assert processed_document.filename == "ejemplo.pdf"
    assert len(processed_document.chunks) >= 1


# Prueba 2: Rechazar un PDF inválido
def test_upload_invalid_pdf():
    response = client.post(
        "/api/v1/documents/upload",
        files={
            "file": (
                "incorrecto.pdf",
                b"Archivo no valido",
                "application/pdf"
            )
        }
    )

    assert response.status_code == 400


# Prueba 3: Manejar un error de PostgreSQL
def test_upload_database_error(monkeypatch):
    # Simular un fallo de base de datos
    mock_save = Mock(
        side_effect=SQLAlchemyError("Error interno de prueba")
    )

    monkeypatch.setattr(
        "app.api.v1.routers.documents.save_document",
        mock_save
    )

    response = client.post(
        "/api/v1/documents/upload",
        files={
            "file": (
                "ejemplo.pdf",
                PDF_PATH.read_bytes(),
                "application/pdf"
            )
        }
    )

    assert response.status_code == 500
    assert response.json()["detail"] == (
    "Error interno al guardar el documento"
    )

    # Confirmar que se intentó guardar
    mock_save.assert_called_once()