from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


# Cliente de pruebas
client = TestClient(app)

# PDF utilizado para pruebas
PDF_PATH = Path(__file__).parent / "fixtures" / "ejemplo.pdf"


# Prueba 1: Subir PDF y generar chunks
def test_upload_pdf_generates_chunks():
    content = PDF_PATH.read_bytes()

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

    assert data["filename"] == "ejemplo.pdf"
    assert data["size_bytes"] == len(content)
    assert data["pages_with_text"] == 1
    assert data["chunk_count"] >= 1
    assert data["text_length"] >= len(
        "Python es un lenguaje de programación"
    )


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