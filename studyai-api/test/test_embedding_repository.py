from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import embedding_repository


@pytest.fixture
def embedding_environment(monkeypatch):
    test_url = get_engine().url.set(database="studyai_test_db")
    engine = create_engine(test_url, pool_pre_ping=True)

    with engine.connect() as connection:
        assert connection.execute(
            text("SELECT current_database()")
        ).scalar_one() == "studyai_test_db"

    monkeypatch.setattr(
        embedding_repository,
        "get_engine",
        lambda: engine,
    )

    document_id = uuid4()
    chunk_id = uuid4()

    with engine.begin() as connection:
        user_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Usuario Embedding',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {"email": f"embedding_{uuid4().hex}@example.com"},
        ).scalar_one()

        other_user_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Otro Usuario',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {"email": f"embedding_other_{uuid4().hex}@example.com"},
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
                    'embedding-test.pdf',
                    100,
                    1,
                    35,
                    :user_id
                );
            """),
            {"id": document_id, "user_id": user_id},
        )

        connection.execute(
            text("""
                INSERT INTO document_chunks (
                    id,
                    document_id,
                    page_number,
                    chunk_index,
                    text
                )
                VALUES (
                    :id,
                    :document_id,
                    1,
                    1,
                    'Python permite desarrollar aplicaciones.'
                );
            """),
            {"id": chunk_id, "document_id": document_id},
        )

    try:
        yield {
            "engine": engine,
            "user_id": user_id,
            "other_user_id": other_user_id,
            "document_id": document_id,
            "chunk_id": chunk_id,
        }

    finally:
        with engine.begin() as connection:
            connection.execute(
                text("DELETE FROM documents WHERE id = :id"),
                {"id": document_id},
            )

            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:user_id, :other_user_id)
                """),
                {
                    "user_id": user_id,
                    "other_user_id": other_user_id,
                },
            )

        engine.dispose()


def test_save_chunk_embedding(embedding_environment):
    data = embedding_environment

    vector = [0.1] * 384

    saved = embedding_repository.save_chunk_embedding_for_user(
        data["chunk_id"],
        data["user_id"],
        vector,
    )

    assert saved is True

    with data["engine"].connect() as connection:
        result = connection.execute(
            text("""
                SELECT vector_dims(embedding)
                FROM document_chunks
                WHERE id = :chunk_id;
            """),
            {"chunk_id": data["chunk_id"]},
        ).scalar_one()

    assert result == 384


def test_other_user_cannot_save_embedding(embedding_environment):
    data = embedding_environment

    saved = embedding_repository.save_chunk_embedding_for_user(
        data["chunk_id"],
        data["other_user_id"],
        [0.1] * 384,
    )

    assert saved is False

    with data["engine"].connect() as connection:
        embedding_is_null = connection.execute(
            text("""
                SELECT embedding IS NULL
                FROM document_chunks
                WHERE id = :chunk_id;
            """),
            {"chunk_id": data["chunk_id"]},
        ).scalar_one()

    assert embedding_is_null is True


def test_reject_invalid_embedding(embedding_environment):
    data = embedding_environment

    with pytest.raises(ValueError, match="384"):
        embedding_repository.save_chunk_embedding_for_user(
            data["chunk_id"],
            data["user_id"],
            [0.1] * 383,
        )