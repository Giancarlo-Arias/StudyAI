from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError

from app.db.connection import get_engine
from app.repositories import document_repository
from app.services.chunking_service import TextChunk
from app.services.document_processing_service import ProcessedDocument


# Preparar una conexión exclusiva para pruebas
@pytest.fixture
def db_engine(monkeypatch):
    # Obtener la configuración existente de PostgreSQL
    original_url = get_engine().url

    # Evitar pruebas contra un servidor remoto
    if original_url.host not in ("127.0.0.1", "localhost"):
        pytest.fail("Las pruebas requieren PostgreSQL local")

    # Utilizar una base distinta a la de desarrollo
    test_url = original_url.set(database="studyai_test_db")

    engine = create_engine(test_url, pool_pre_ping=True)
    
    try:
        # Comprobar que estamos en la base de pruebas
        with engine.connect() as connection:
            database_name = connection.execute(
                text("SELECT current_database()")
            ).scalar_one()
        # Mostrar la base utilizada
        print(f"\nBase de datos utilizada: {database_name}")

        # Detener la prueba si no estamos en la base de pruebas
        assert database_name == "studyai_test_db"

        # Hacer que el repositorio use esta conexión
        # únicamente durante la prueba
        monkeypatch.setattr(
            document_repository,
            "get_engine",
            lambda: engine
        )

        yield engine

    finally:
        engine.dispose()


# Crear un documento ficticio con dos fragmentos
def build_document(
    filename: str,
    second_chunk_index: int = 2
) -> ProcessedDocument:

    chunks = (
        TextChunk(
            page_number=1,
            chunk_index=1,
            text="Primera página de StudyAI."
        ),
        TextChunk(
            page_number=2,
            chunk_index=second_chunk_index,
            text="Segunda página de StudyAI."
        )
    )

    return ProcessedDocument(
        filename=filename,
        size_bytes=2048,
        pages_with_text=2,
        text_length=sum(len(chunk.text) for chunk in chunks) + 1,
        chunks=chunks
    )


# Eliminar registros creados por las pruebas
def delete_test_document(engine: Engine, filename: str) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("""
                DELETE FROM documents
                WHERE filename = :filename
            """),
            {"filename": filename}
        )


# Prueba 1: Guardar documento y comprobar sus relaciones
def test_save_document_and_chunks(db_engine):
    filename = f"pytest_{uuid4().hex}.pdf"
    document = build_document(filename)

    try:
        document_id = document_repository.save_document(document)

        # Consultar el documento y sus fragmentos usando JOIN
        with db_engine.connect() as connection:
            rows = connection.execute(
                text("""
                    SELECT
                        d.filename,
                        d.size_bytes,
                        c.page_number,
                        c.chunk_index,
                        c.text
                    FROM documents AS d
                    INNER JOIN document_chunks AS c
                        ON d.id = c.document_id
                    WHERE d.id = :document_id
                    ORDER BY c.chunk_index
                """),
                {"document_id": document_id}
            ).mappings().all()

        assert len(rows) == 2

        assert rows[0]["filename"] == filename
        assert rows[0]["size_bytes"] == 2048

        assert rows[0]["page_number"] == 1
        assert rows[0]["chunk_index"] == 1

        assert rows[1]["page_number"] == 2
        assert rows[1]["chunk_index"] == 2

    finally:
        # Se ejecuta incluso si una comprobación falla
        delete_test_document(db_engine, filename)


# Prueba 2: Verificar ROLLBACK ante un error SQL
def test_rollback_on_invalid_chunk(db_engine):
    filename = f"pytest_{uuid4().hex}.pdf"

    # El segundo chunk tiene un índice inválido
    document = build_document(
        filename,
        second_chunk_index=0
    )

    try:
        # PostgreSQL debe rechazar la inserción
        with pytest.raises(IntegrityError):
            document_repository.save_document(document)

        # Comprobar que tampoco quedó guardado el documento
        with db_engine.connect() as connection:
            count = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM documents
                    WHERE filename = :filename
                """),
                {"filename": filename}
            ).scalar_one()

        assert count == 0

    finally:
        # Limpieza adicional por seguridad
        delete_test_document(db_engine, filename)

# Prueba 3: Eliminar documento y comprobar ON DELETE CASCADE
def test_delete_document_cascades(db_engine):
    filename = f"pytest_{uuid4().hex}.pdf"
    document = build_document(filename)

    try:
        # Guardar un documento con dos chunks
        document_id = document_repository.save_document(document)

        with db_engine.connect() as connection:
            chunks_before = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM document_chunks
                    WHERE document_id = :document_id
                """),
                {"document_id": document_id}
            ).scalar_one()

        assert chunks_before == 2

        # Eliminar el documento
        assert document_repository.delete_document(document_id) is True

        # Verificar que desaparecieron documento y chunks
        with db_engine.connect() as connection:
            document_count = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM documents
                    WHERE id = :document_id
                """),
                {"document_id": document_id}
            ).scalar_one()

            chunk_count = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM document_chunks
                    WHERE document_id = :document_id
                """),
                {"document_id": document_id}
            ).scalar_one()

        assert document_count == 0
        assert chunk_count == 0

        # Intentar eliminarlo nuevamente debe devolver False
        assert document_repository.delete_document(document_id) is False

    finally:
        # Limpieza por si alguna comprobación falla
        delete_test_document(db_engine, filename)