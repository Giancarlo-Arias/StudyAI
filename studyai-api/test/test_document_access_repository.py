from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import document_access_repository


@pytest.fixture
def document_access_environment(monkeypatch):
    """Utilizar exclusivamente PostgreSQL de pruebas."""

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

    owner_email = f"owner_{uuid4().hex}@example.com"
    other_email = f"other_{uuid4().hex}@example.com"

    owned_document_id = uuid4()
    missing_document_id = uuid4()

    with test_engine.begin() as connection:
        owner_id = connection.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash)
                VALUES ('Propietario', :email, 'hash-de-prueba')
                RETURNING id;
            """),
            {"email": owner_email},
        ).scalar_one()

        other_user_id = connection.execute(
            text("""
                INSERT INTO users (full_name, email, password_hash)
                VALUES ('Otro usuario', :email, 'hash-de-prueba')
                RETURNING id;
            """),
            {"email": other_email},
        ).scalar_one()

        connection.execute(
            text("""
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
                    'documento-propio.pdf',
                    100,
                    1,
                    50,
                    :user_id
                );
            """),
            {
                "id": owned_document_id,
                "user_id": owner_id,
            },
        )

    try:
        yield owner_id, other_user_id, owned_document_id, missing_document_id

    finally:
        with test_engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM documents
                    WHERE id = :document_id;
                """),
                {"document_id": owned_document_id},
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


# Prueba 1: El propietario puede consultar su documento
def test_owner_can_access_document(document_access_environment):
    owner_id, _, document_id, _ = document_access_environment

    document = document_access_repository.get_document_for_user(
        document_id,
        owner_id,
    )

    assert document is not None
    assert document["id"] == document_id
    assert document["filename"] == "documento-propio.pdf"


# Prueba 2: Otro usuario no puede consultar el documento
def test_other_user_cannot_access_document(document_access_environment):
    _, other_user_id, document_id, _ = document_access_environment

    document = document_access_repository.get_document_for_user(
        document_id,
        other_user_id,
    )

    assert document is None


# Prueba 3: Un documento inexistente no puede consultarse
def test_missing_document_is_not_accessible(document_access_environment):
    owner_id, _, _, document_id = document_access_environment

    document = document_access_repository.get_document_for_user(
        document_id,
        owner_id,
    )

    assert document is None


# Prueba 4: El propietario puede eliminar su documento
def test_owner_can_delete_document(document_access_environment):
    owner_id, _, document_id, _ = document_access_environment

    deleted = document_access_repository.delete_document_for_user(
        document_id,
        owner_id,
    )

    assert deleted is True

    document = document_access_repository.get_document_for_user(
        document_id,
        owner_id,
    )

    assert document is None


# Prueba 5: Otro usuario no puede eliminar el documento
def test_other_user_cannot_delete_document(document_access_environment):
    owner_id, other_user_id, document_id, _ = document_access_environment

    deleted = document_access_repository.delete_document_for_user(
        document_id,
        other_user_id,
    )

    assert deleted is False

    document = document_access_repository.get_document_for_user(
        document_id,
        owner_id,
    )

    assert document is not None


# Prueba 6: Un documento inexistente no puede eliminarse
def test_missing_document_cannot_be_deleted(document_access_environment):
    owner_id, _, _, document_id = document_access_environment

    deleted = document_access_repository.delete_document_for_user(
        document_id,
        owner_id,
    )

    assert deleted is False