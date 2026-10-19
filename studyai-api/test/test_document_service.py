
# Librerías
from io import BytesIO

import pytest
from pypdf import PdfWriter

# Servicio de documentos
from app.services.document_service import (
    MAX_FILE_SIZE,
    InvalidDocumentError,
    DocumentTooLargeError,
    validate_pdf,
    extract_pdf_text,
)


# Prueba 1: PDF válido
def test_valid_pdf():
    content = b"%PDF-1.4\nContenido de prueba"

    result = validate_pdf("apuntes.pdf", content)

    assert result["filename"] == "apuntes.pdf"
    assert result["size_bytes"] == len(content)


# Prueba 2: Extensión incorrecta
def test_invalid_extension():
    with pytest.raises(InvalidDocumentError):
        validate_pdf("apuntes.txt", b"Archivo de texto")


# Prueba 3: Archivo demasiado grande
def test_large_pdf():
    content = b"%PDF-" + b"0" * MAX_FILE_SIZE

    with pytest.raises(DocumentTooLargeError):
        validate_pdf("apuntes.pdf", content)


# Prueba 4: Firma PDF incorrecta
def test_invalid_pdf_signature():
    with pytest.raises(InvalidDocumentError):
        validate_pdf("apuntes.pdf", b"Contenido falso")



# Prueba 5: PDF sin texto
def test_pdf_without_text():
    writer = PdfWriter()
    writer.add_blank_page(width=595, height=842)

    pdf_buffer = BytesIO()
    writer.write(pdf_buffer)

    with pytest.raises(InvalidDocumentError):
        extract_pdf_text(pdf_buffer.getvalue())
