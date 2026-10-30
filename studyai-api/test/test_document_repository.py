from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError

from app.db.connection import get_engine
from app.repositories import (
    document_access_repository,
    document_repository,
)


# Preparar PostgreSQL de pruebas y un usuario propietario
@pytest.fixture
def test_database(monkeypatch):
    test_url = get_engine().url.set(database="studyai_test_db")
    test_engine = create_engine(test_url, pool_pre_ping=True)

    with test_engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database_name == "studyai_test_db"

    monkeypatch.setattr(
        document_repository,
        "get_engine",
        lambda: test_engine,
    )

    monkeypatch.setattr(
        document_access_repository,
        "get_engine",
        lambda: test_engine,
    )

    with test_engine.begin() as connection:
        user_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash
                )
                VALUES (
                    'Usuario Prueba',
                    :email,
                    'hash-de-prueba'
                )
                RETURNING id;
            """),
            {"email": f"test_{uuid4().hex}@example.com"},
        ).scalar_one()

    try:
        yield test_engine, user_id

    finally:
        # Limpiar los documentos creados por este usuario
        with test_engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM documents
                    WHERE user_id = :user_id;
                """),
                {"user_id": user_id},
            )

            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id = :user_id;
                """),
                {"user_id": user_id},
            )

        test_engine.dispose()


# Crear un documento procesado para las pruebas
def create_test_document():
    return SimpleNamespace(
        filename=f"{uuid4()}.pdf",
        size_bytes=200,
        pages_with_text=1,
        text_length=50,
        chunks=[
            SimpleNamespace(
                page_number=1,
                chunk_index=1,
                text="Primer fragmento del documento",
            ),
            SimpleNamespace(
                page_number=1,
                chunk_index=2,
                text="Segundo fragmento del documento",
            ),
        ],
    )


# Prueba 1: Guardar documento, propietario y chunks
def test_save_document_and_chunks(test_database):
    engine, user_id = test_database

    document = create_test_document()

    document_id = document_repository.save_document_for_user(
        document,
        user_id,
    )

    with engine.connect() as connection:
        saved_document = connection.execute(
            text("""
                SELECT id, filename, user_id
                FROM documents
                WHERE id = :document_id;
            """),
            {"document_id": document_id},
        ).mappings().one()

        chunks = connection.execute(
            text("""
                SELECT page_number, chunk_index, text
                FROM document_chunks
                WHERE document_id = :document_id
                ORDER BY chunk_index;
            """),
            {"document_id": document_id},
        ).mappings().all()

    assert saved_document["id"] == document_id
    assert saved_document["filename"] == document.filename
    assert saved_document["user_id"] == user_id

    assert len(chunks) == 2
    assert chunks[0]["chunk_index"] == 1
    assert chunks[1]["chunk_index"] == 2


# Prueba 2: Revertir toda la transacción si un chunk es inválido
def test_rollback_on_invalid_chunk(test_database):
    engine, user_id = test_database

    document = create_test_document()

    # PostgreSQL no permite chunk_index = 0
    document.chunks[1].chunk_index = 0

    with pytest.raises(IntegrityError):
        document_repository.save_document_for_user(
            document,
            user_id,
        )

    # El documento tampoco debe haberse guardado
    with engine.connect() as connection:
        count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM documents
                WHERE filename = :filename
                  AND user_id = :user_id;
            """),
            {
                "filename": document.filename,
                "user_id": user_id,
            },
        ).scalar_one()

    assert count == 0


# Prueba 3: Eliminar un PDF y sus chunks, conservando los demás
def test_delete_document_cascades(test_database):
    engine, user_id = test_database

    first_id = document_repository.save_document_for_user(
        create_test_document(),
        user_id,
    )

    second_id = document_repository.save_document_for_user(
        create_test_document(),
        user_id,
    )

    deleted = document_access_repository.delete_document_for_user(
        first_id,
        user_id,
    )

    assert deleted is True

    with engine.connect() as connection:
        deleted_document_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM documents
                WHERE id = :document_id;
            """),
            {"document_id": first_id},
        ).scalar_one()

        deleted_chunks_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks
                WHERE document_id = :document_id;
            """),
            {"document_id": first_id},
        ).scalar_one()

        remaining_document_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM documents
                WHERE id = :document_id
                  AND user_id = :user_id;
            """),
            {
                "document_id": second_id,
                "user_id": user_id,
            },
        ).scalar_one()

        remaining_chunks_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks
                WHERE document_id = :document_id;
            """),
            {"document_id": second_id},
        ).scalar_one()

    assert deleted_document_count == 0
    assert deleted_chunks_count == 0
    assert remaining_document_count == 1
    assert remaining_chunks_count == 2

    # Eliminar nuevamente el mismo PDF debe devolver False
    assert document_access_repository.delete_document_for_user(
        first_id,
        user_id,
    ) is False