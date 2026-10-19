
from pathlib import Path

from app.services.document_service import (
    extract_pdf_text, 
    extract_pdf_pages,
)

# Ruta del PDF de prueba
PDF_PATH = Path(__file__).parent / "fixtures" / "ejemplo.pdf"

# Prueba 1: Extracción de texto
def test_extract_pdf_text():
    # Leer el archivo
    content = PDF_PATH.read_bytes()

    # Extraer su texto
    text = extract_pdf_text(content)

    # Comprobar el contenido
    assert "Python es un lenguaje de programación" in text

# Prueba 2: Conservar información de las páginas
def test_extract_pdf_pages():

    content = PDF_PATH.read_bytes()

    pages = extract_pdf_pages(content)

    assert len(pages) >= 1
    assert pages[0].page_number == 1
    assert "Python es un lenguaje de programación" in pages[0].text