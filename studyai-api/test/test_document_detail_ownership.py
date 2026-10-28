from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import document_access_repository


@pytest.fixture
def document_detail_environment(monkeypatch):
    test_url = get_engine().url.set(database="studyai_test_db")
    test_engine = create_engine(test_url, pool_pre_ping=True)

    with test_engine.connect() as connection:
        assert connection.execute(
            text("SELECT current_database()")
        ).scalar_one() == "studyai_test_db"

    monkeypatch.setattr(
        document_access_repository,
        "get_engine",
        lambda: test_engine,
    )

    own_document_id = uuid4()
    other_document_id = uuid4()
    unassigned_document_id = uuid4()

    with test_engine.begin() as connection:
        owner_id = connection.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash)
                VALUES ('Propietario', :email, 'hash-de-prueba')
                RETURNING id;
            """),
            {"email": f"owner_{uuid4().hex}@example.com"},
        ).scalar_one()

        other_user_id = connection.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash)
                VALUES ('Otro usuario', :email, 'hash-de-prueba')
                RETURNING id;
            """),
            {"email": f"other_{uuid4().hex}@example.com"},
        ).scalar_one()

        insert_document = text("""
            INSERT INTO documents (
                id, filename, size_bytes,
                pages_with_text, text_length, user_id
            )
            VALUES (
                :id, :filename, 100, 1, 50, :user_id
            );
        """)

        for document_id, filename, user_id in [
            (own_document_id, "propio.pdf", owner_id),
            (other_document_id, "ajeno.pdf", other_user_id),
            (unassigned_document_id, "antiguo.pdf", None),
        ]:
            connection.execute(
                insert_document,
                {
                    "id": document_id,
                    "filename": filename,
                    "user_id": user_id,
                },
            )

        connection.execute(
            text("""
                INSERT INTO document_chunks (
                    document_id, page_number, chunk_index, text
                )
                VALUES (
                    :document_id, 1, :chunk_index, :text
                );
            """),
            [
                {
                    "document_id": own_document_id,
                    "chunk_index": 1,
                    "text": "Primer fragmento",
                },
                {
                    "document_id": own_document_id,
                    "chunk_index": 2,
                    "text": "Segundo fragmento",
                },
                {
                    "document_id": other_document_id,
                    "chunk_index": 1,
                    "text": "Contenido privado",
                },
            ],
        )

    try:
        yield (
            owner_id,
            other_user_id,
            own_document_id,
            other_document_id,
            unassigned_document_id,
        )

    finally:
        with test_engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM documents
                    WHERE id IN (:own_id, :other_id, :unassigned_id);
                """),
                {
                    "own_id": own_document_id,
                    "other_id": other_document_id,
                    "unassigned_id": unassigned_document_id,
                },
            )

            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:owner_id, :other_user_id);
                """),
                {
                    "owner_id": owner_id,
                    "other_user_id": other_user_id,
                },
            )

        test_engine.dispose()


def test_owner_can_read_document_and_chunks(document_detail_environment):
    owner_id, _, document_id, _, _ = document_detail_environment

    result = document_access_repository.get_document_with_chunks_for_user(
        document_id,
        owner_id,
    )

    assert result is not None
    assert result["document"]["id"] == document_id
    assert result["chunk_count"] == 2
    assert len(result["chunks"]) == 2
    assert result["chunks"][0]["text"] == "Primer fragmento"
    assert result["chunks"][1]["text"] == "Segundo fragmento"


def test_other_user_cannot_read_document(document_detail_environment):
    owner_id, other_user_id, document_id, other_document_id, _ = (
        document_detail_environment
    )

    result = document_access_repository.get_document_with_chunks_for_user(
        document_id,
        other_user_id,
    )

    assert result is None

    reverse_result = (
        document_access_repository.get_document_with_chunks_for_user(
            other_document_id,
            owner_id,
        )
    )

    assert reverse_result is None


def test_unassigned_document_cannot_be_read(document_detail_environment):
    owner_id, _, _, _, unassigned_id = document_detail_environment

    result = document_access_repository.get_document_with_chunks_for_user(
        unassigned_id,
        owner_id,
    )

    assert result is None


def test_document_chunks_pagination(document_detail_environment):
    owner_id, _, document_id, _, _ = document_detail_environment

    result = document_access_repository.get_document_with_chunks_for_user(
        document_id,
        owner_id,
        limit=1,
        offset=1,
    )

    assert result["chunk_count"] == 2
    assert len(result["chunks"]) == 1
    assert result["chunks"][0]["text"] == "Segundo fragmento"
    assert result["limit"] == 1
    assert result["offset"] == 1