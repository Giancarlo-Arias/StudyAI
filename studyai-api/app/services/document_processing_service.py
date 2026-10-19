from dataclasses import dataclass

from app.services.document_service import (
    validate_pdf,
    extract_pdf_pages,
)

from app.services.chunking_service import (
    TextChunk,
    chunk_pages,
)


# Resultado interno del procesamiento
@dataclass(frozen=True)
class ProcessedDocument:
    filename: str
    size_bytes: int
    pages_with_text: int
    text_length: int
    chunks: tuple[TextChunk, ...]


# Coordinar validación, extracción y chunking
def process_pdf( filename: str | None, content: bytes ) -> ProcessedDocument:

    # 1. Validar el documento
    metadata = validate_pdf(filename, content)

    # 2. Extraer texto por página
    pages = extract_pdf_pages(content)

    # 3. Dividir el texto en fragmentos
    chunks = chunk_pages(pages)

    # 4. Preparar el resultado
    return ProcessedDocument(
        filename=metadata["filename"],
        size_bytes=metadata["size_bytes"],
        pages_with_text=len(pages),
        text_length=len("\n".join(page.text for page in pages)),
        chunks=tuple(chunks)
    )