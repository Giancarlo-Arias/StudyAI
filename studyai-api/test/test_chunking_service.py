import pytest

from app.services.document_service import ExtractedPage
from app.services.chunking_service import TextChunk, chunk_pages


# Prueba 1: Texto corto
def test_short_text():
    pages = [
        ExtractedPage(
            page_number=1,
            text="Python es un lenguaje de programación."
        )
    ]

    chunks = chunk_pages(pages)

    assert chunks == [
        TextChunk(
            page_number=1,
            chunk_index=1,
            text="Python es un lenguaje de programación."
        )
    ]


# Prueba 2: Conservar los números de página
def test_multiple_pages():
    pages = [
        ExtractedPage(page_number=1, text="Primera página"),
        ExtractedPage(page_number=2, text=""),
        ExtractedPage(page_number=3, text="Tercera página"),
    ]

    chunks = chunk_pages(pages)

    assert len(chunks) == 2

    assert chunks[0].page_number == 1
    assert chunks[0].chunk_index == 1

    assert chunks[1].page_number == 3
    assert chunks[1].chunk_index == 2


# Prueba 3: Dividir texto largo con solapamiento
def test_long_text_with_overlap():
    text = " ".join(f"concepto{i}" for i in range(60))

    pages = [
        ExtractedPage(page_number=2, text=text)
    ]

    chunks = chunk_pages(
        pages,
        chunk_size=80,
        chunk_overlap=20
    )

    assert len(chunks) > 1

    assert all(len(chunk.text) <= 80 for chunk in chunks)
    assert all(chunk.page_number == 2 for chunk in chunks)

    # Comprobar que los fragmentos consecutivos
    # comparten palabras del contenido original
    for current, following in zip(chunks, chunks[1:]):
        shared_words = (
            set(current.text.split())
            & set(following.text.split())
        )

        assert shared_words


# Prueba 4: Configuración incorrecta
def test_invalid_chunk_configuration():
    pages = [
        ExtractedPage(page_number=1, text="Texto de prueba")
    ]

    with pytest.raises(ValueError):
        chunk_pages(pages, chunk_size=0)

    with pytest.raises(ValueError):
        chunk_pages(pages, chunk_size=100, chunk_overlap=-1)

    with pytest.raises(ValueError):
        chunk_pages(pages, chunk_size=100, chunk_overlap=100)