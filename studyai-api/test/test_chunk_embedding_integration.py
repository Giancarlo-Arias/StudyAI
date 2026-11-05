from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import embedding_repository
from app.services import chunk_embedding_service, embedding_service


class FakeEmbeddingResult:
    def __init__(self, data):
        self.data = data

    def tolist(self):
        return self.data


class FakeEmbeddingModel:
    def __init__(self):
        self.calls = []

    def encode(self, texts, normalize_embeddings=False):
        self.calls.append((texts, normalize_embeddings))

        return FakeEmbeddingResult([
            [0.1] * 384 for _ in texts
        ])


@pytest.fixture
def integration_environment(monkeypatch):
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

    fake_model = FakeEmbeddingModel()

    monkeypatch.setattr(
        embedding_service,
        "get_embedding_model",
        lambda: fake_model,
    )

    document_id = uuid4()
    chunk_id = uuid4()
    chunk_text = "Python permite desarrollar aplicaciones."

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
                    'Usuario Integracion',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {"email": f"integration_{uuid4().hex}@example.com"},
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
                    'integration.pdf',
                    100,
                    1,
                    :text_length,
                    :user_id
                );
            """),
            {
                "id": document_id,
                "text_length": len(chunk_text),
                "user_id": user_id,
            },
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
                    :text
                );
            """),
            {
                "id": chunk_id,
                "document_id": document_id,
                "text": chunk_text,
            },
        )

    try:
        yield {
            "engine": engine,
            "user_id": user_id,
            "document_id": document_id,
            "chunk_id": chunk_id,
            "chunk_text": chunk_text,
            "fake_model": fake_model,
        }

    finally:
        with engine.begin() as connection:
            connection.execute(
                text("DELETE FROM documents WHERE id = :id"),
                {"id": document_id},
            )

            connection.execute(
                text("DELETE FROM users WHERE id = :id"),
                {"id": user_id},
            )

        engine.dispose()


def test_generate_and_save_embedding_in_postgresql(integration_environment):
    data = integration_environment

    result = chunk_embedding_service.generate_and_save_chunk_embedding(
        chunk_id=data["chunk_id"],
        user_id=data["user_id"],
        chunk_text=data["chunk_text"],
    )

    assert result is True

    assert data["fake_model"].calls == [
        (
            [f"passage: {data['chunk_text']}"],
            True,
        )
    ]

    with data["engine"].connect() as connection:
        stored_embedding = connection.execute(
            text("""
                SELECT
                    vector_dims(embedding) AS dimensions,
                    embedding IS NOT NULL AS has_embedding
                FROM document_chunks
                WHERE id = :chunk_id;
            """),
            {"chunk_id": data["chunk_id"]},
        ).one()

    assert stored_embedding.dimensions == 384
    assert stored_embedding.has_embedding is True