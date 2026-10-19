from dataclasses import dataclass

from app.services.document_service import ExtractedPage


# Configuración del chunking
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 150


# Estructura de cada fragmento
@dataclass(frozen=True)
class TextChunk:
    page_number: int
    chunk_index: int
    text: str


# Dividir el texto de una página en fragmentos
def _split_page_text(
    text: str,
    chunk_size: int,
    chunk_overlap: int
) -> list[str]:
    text = text.strip()
    fragments = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))

        # Buscar un límite natural para cortar el texto
        if end < len(text):
            min_boundary = start + max(
                chunk_overlap + 1,
                int(chunk_size * 0.6)
            )

            if min_boundary < end:
                for separator in ("\n\n", "\n", ". ", "? ", "! ", " "):
                    position = text.rfind(separator, min_boundary, end)

                    if position != -1:
                        end = position + len(separator)
                        break

        fragment = text[start:end].strip()

        if fragment:
            fragments.append(fragment)

        if end == len(text):
            break

        # Retroceder para conservar parte del contexto
        start = end - chunk_overlap

        # Evitar comenzar a mitad de palabra cuando sea posible
        if 0 < start < end and not text[start - 1].isspace():
            boundary = next(
                (i for i in range(start, end) if text[i].isspace()),
                None
            )

            if boundary is not None and boundary + 1 < end:
                start = boundary + 1

    return fragments


# Generar fragmentos conservando los metadatos
def chunk_pages(
    pages: list[ExtractedPage],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
) -> list[TextChunk]:

    # Validar configuración
    if chunk_size <= 0:
        raise ValueError("chunk_size debe ser mayor que cero")

    if not 0 <= chunk_overlap < chunk_size:
        raise ValueError(
            "chunk_overlap debe ser mayor o igual a cero "
            "y menor que chunk_size"
        )

    chunks = []

    for page in pages:
        fragments = _split_page_text(
            page.text,
            chunk_size,
            chunk_overlap
        )

        for fragment in fragments:
            chunks.append(
                TextChunk(
                    page_number=page.page_number,
                    chunk_index=len(chunks) + 1,
                    text=fragment
                )
            )

    return chunks