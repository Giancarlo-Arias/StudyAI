
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import embedding_repository
from app.services import document_embedding_service, embedding_service


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
    other_document_id = uuid4()

    chunk_texts = [
        "Python es un lenguaje de programación.",
        "FastAPI permite desarrollar APIs.",
        "PostgreSQL permite almacenar información.",
    ]

    chunk_ids = [uuid4() for _ in chunk_texts]
    other_chunk_id = uuid4()

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
                    'Usuario Embeddings',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {"email": f"embeddings_{uuid4().hex}@example.com"},
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
            {"email": f"other_embeddings_{uuid4().hex}@example.com"},
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
                    :filename,
                    100,
                    1,
                    :text_length,
                    :user_id
                );
            """),
            [
                {
                    "id": document_id,
                    "filename": "documento-propio.pdf",
                    "text_length": sum(len(t) for t in chunk_texts),
                    "user_id": user_id,
                },
                {
                    "id": other_document_id,
                    "filename": "documento-ajeno.pdf",
                    "text_length": 30,
                    "user_id": other_user_id,
                },
            ],
        )

        chunks = [
            {
                "id": chunk_id,
                "document_id": document_id,
                "page_number": 1,
                "chunk_index": index,
                "text": chunk_text,
            }
            for index, (chunk_id, chunk_text) in enumerate(
                zip(chunk_ids, chunk_texts),
                start=1,
            )
        ]

        chunks.append({
            "id": other_chunk_id,
            "document_id": other_document_id,
            "page_number": 1,
            "chunk_index": 1,
            "text": "Documento privado de otro usuario.",
        })

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
                    :page_number,
                    :chunk_index,
                    :text
                );
            """),
            chunks,
        )

    try:
        yield {
            "engine": engine,
            "user_id": user_id,
            "other_user_id": other_user_id,
            "document_id": document_id,
            "other_document_id": other_document_id,
            "chunk_ids": chunk_ids,
            "other_chunk_id": other_chunk_id,
            "chunk_texts": chunk_texts,
            "fake_model": fake_model,
        }

    finally:
        with engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM documents
                    WHERE id IN (:document_id, :other_document_id);
                """),
                {
                    "document_id": document_id,
                    "other_document_id": other_document_id,
                },
            )

            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:user_id, :other_user_id);
                """),
                {
                    "user_id": user_id,
                    "other_user_id": other_user_id,
                },
            )

        engine.dispose()


def test_generate_embeddings_for_multiple_chunks_in_postgresql(
    integration_environment,
):
    data = integration_environment

    # Otro usuario no puede procesar este documento
    unauthorized_result = (
        document_embedding_service.generate_and_save_document_embeddings(
            document_id=data["document_id"],
            user_id=data["other_user_id"],
            batch_size=2,
        )
    )

    assert unauthorized_result == 0
    assert data["fake_model"].calls == []

    # Procesar los 3 chunks en lotes de 2
    result = (
        document_embedding_service.generate_and_save_document_embeddings(
            document_id=data["document_id"],
            user_id=data["user_id"],
            batch_size=2,
        )
    )

    assert result == 3

    # Verificar que E5 recibió dos lotes
    assert data["fake_model"].calls == [
        (
            [f"passage: {t}" for t in data["chunk_texts"][:2]],
            True,
        ),
        (
            [f"passage: {data['chunk_texts'][2]}"],
            True,
        ),
    ]

    # Verificar los embeddings almacenados en PostgreSQL
    with data["engine"].connect() as connection:
        stored_chunks = connection.execute(
            text("""
                SELECT
                    id,
                    vector_dims(embedding) AS dimensions
                FROM document_chunks
                WHERE document_id = :document_id
                ORDER BY chunk_index;
            """),
            {"document_id": data["document_id"]},
        ).mappings().all()

        other_embedding_is_null = connection.execute(
            text("""
                SELECT embedding IS NULL
                FROM document_chunks
                WHERE id = :chunk_id;
            """),
            {"chunk_id": data["other_chunk_id"]},
        ).scalar_one()

    assert len(stored_chunks) == 3
    assert [row["id"] for row in stored_chunks] == data["chunk_ids"]
    assert all(row["dimensions"] == 384 for row in stored_chunks)

    # El documento del otro usuario permanece sin modificar
    assert other_embedding_is_null is True

    # Una segunda ejecución no debe reprocesar los chunks
    second_result = (
        document_embedding_service.generate_and_save_document_embeddings(
            document_id=data["document_id"],
            user_id=data["user_id"],
            batch_size=2,
        )
    )

    assert second_result == 0
    assert len(data["fake_model"].calls) == 2
