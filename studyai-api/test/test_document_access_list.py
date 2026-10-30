from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import document_access_repository


@pytest.fixture
def document_list_environment(monkeypatch):
    """Preparar documentos de distintos usuarios en la base de pruebas."""

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

    with test_engine.begin() as connection:
        owner_id = connection.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash)
                VALUES ('Propietario', :email, 'hash-de-prueba')
                RETURNING id;
            """),
            {"email": f"owner_{uuid4().hex}@example.com"},
        ).scalar_one()

        other_id = connection.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash)
                VALUES ('Otro usuario', :email, 'hash-de-prueba')
                RETURNING id;
            """),
            {"email": f"other_{uuid4().hex}@example.com"},
        ).scalar_one()

        owner_documents = [uuid4(), uuid4()]
        other_document = uuid4()

        insert_document = text("""
            INSERT INTO documents (
                id,
                filename,
                size_bytes,
                pages_with_text,
                text_length,
                user_id
            )
            VALUES (
                :id,
                :filename,
                100,
                1,
                50,
                :user_id
            );
        """)

        for document_id, filename, user_id in [
            (owner_documents[0], "primero.pdf", owner_id),
            (owner_documents[1], "segundo.pdf", owner_id),
            (other_document, "otro.pdf", other_id),
        ]:
            connection.execute(
                insert_document,
                {
                    "id": document_id,
                    "filename": filename,
                    "user_id": user_id,
                },
            )

    try:
        yield owner_id, other_id, owner_documents, other_document

    finally:
        with test_engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM documents
                    WHERE id IN (
                        :first_id,
                        :second_id,
                        :other_id
                    );
                """),
                {
                    "first_id": owner_documents[0],
                    "second_id": owner_documents[1],
                    "other_id": other_document,
                },
            )

            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:owner_id, :other_id);
                """),
                {
                    "owner_id": owner_id,
                    "other_id": other_id,
                },
            )

        test_engine.dispose()


# Prueba 1: Listar únicamente documentos propios
def test_list_only_owner_documents(document_list_environment):
    owner_id, _, owner_documents, _ = document_list_environment

    documents = document_access_repository.list_documents_for_user(
        owner_id
    )

    assert len(documents) == 2
    assert {document["id"] for document in documents} == set(
        owner_documents
    )


# Prueba 2: Cada usuario puede listar sus propios documentos
def test_list_other_user_documents(document_list_environment):
    _, other_id, _, other_document = document_list_environment

    documents = document_access_repository.list_documents_for_user(
        other_id
    )

    assert len(documents) == 1
    assert documents[0]["id"] == other_document


# Prueba 3: Validar la paginación
def test_list_pagination(document_list_environment):
    owner_id, _, owner_documents, _ = document_list_environment

    first_page = document_access_repository.list_documents_for_user(
        owner_id,
        limit=1,
        offset=0,
    )

    second_page = document_access_repository.list_documents_for_user(
        owner_id,
        limit=1,
        offset=1,
    )

    third_page = document_access_repository.list_documents_for_user(
        owner_id,
        limit=1,
        offset=2,
    )

    assert len(first_page) == 1
    assert len(second_page) == 1
    assert third_page == []

    returned_ids = {
        first_page[0]["id"],
        second_page[0]["id"],
    }

    assert returned_ids == set(owner_documents)


# Prueba 4: Rechazar paginación inválida
def test_list_invalid_pagination(document_list_environment):
    owner_id, _, _, _ = document_list_environment

    with pytest.raises(ValueError):
        document_access_repository.list_documents_for_user(
            owner_id,
            limit=0,
        )

    with pytest.raises(ValueError):
        document_access_repository.list_documents_for_user(
            owner_id,
            offset=-1,
        )