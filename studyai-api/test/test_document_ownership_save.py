from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import document_repository


@pytest.fixture
def ownership_environment(monkeypatch):
    test_url = get_engine().url.set(database="studyai_test_db")
    test_engine = create_engine(test_url, pool_pre_ping=True)

    with test_engine.connect() as connection:
        database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database == "studyai_test_db"

    monkeypatch.setattr(
        document_repository,
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
                    'Usuario Propietario',
                    :email,
                    'hash-de-prueba'
                )
                RETURNING id;
            """),
            {"email": f"owner_{uuid4().hex}@example.com"},
        ).scalar_one()

    try:
        yield test_engine, user_id

    finally:
        with test_engine.begin() as connection:
            connection.execute(
                text("DELETE FROM users WHERE id = :user_id"),
                {"user_id": user_id},
            )

        test_engine.dispose()


def create_test_document():
    return SimpleNamespace(
        filename=f"{uuid4()}.pdf",
        size_bytes=200,
        pages_with_text=1,
        text_length=30,
        chunks=[
            SimpleNamespace(
                page_number=1,
                chunk_index=1,
                text="Contenido del documento",
            )
        ],
    )


def test_save_document_with_owner(ownership_environment):
    engine, user_id = ownership_environment

    document_id = document_repository.save_document_for_user(
        create_test_document(),
        user_id,
    )

    with engine.connect() as connection:
        saved_owner = connection.execute(
            text("""
                SELECT user_id
                FROM documents
                WHERE id = :document_id;
            """),
            {"document_id": document_id},
        ).scalar_one()

        chunk_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks
                WHERE document_id = :document_id;
            """),
            {"document_id": document_id},
        ).scalar_one()

    assert saved_owner == user_id
    assert chunk_count == 1


def test_save_document_rejects_invalid_owner(ownership_environment):
    _, _ = ownership_environment

    with pytest.raises(ValueError):
        document_repository.save_document_for_user(
            create_test_document(),
            0,
        )