from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import semantic_search_repository


def make_vector(first: float, second: float) -> str:
    values = [first, second] + [0.0] * 382

    return "[" + ",".join(str(value) for value in values) + "]"


@pytest.fixture
def search_environment(monkeypatch):
    test_url = get_engine().url.set(database="studyai_test_db")
    engine = create_engine(test_url, pool_pre_ping=True)

    with engine.connect() as connection:
        assert connection.execute(
            text("SELECT current_database()")
        ).scalar_one() == "studyai_test_db"

    monkeypatch.setattr(
        semantic_search_repository,
        "get_engine",
        lambda: engine,
    )

    document_a = uuid4()
    document_a2 = uuid4()
    document_b = uuid4()

    chunk_a1 = uuid4()
    chunk_a2 = uuid4()
    chunk_a3 = uuid4()
    chunk_pending = uuid4()
    chunk_b = uuid4()

    with engine.begin() as connection:
        user_a_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Usuario A',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {"email": f"search_a_{uuid4().hex}@example.com"},
        ).scalar_one()

        user_b_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Usuario B',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {"email": f"search_b_{uuid4().hex}@example.com"},
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
                    50,
                    :user_id
                );
            """),
            [
                {
                    "id": document_a,
                    "filename": "python.pdf",
                    "user_id": user_a_id,
                },
                {
                    "id": document_a2,
                    "filename": "fastapi.pdf",
                    "user_id": user_a_id,
                },
                {
                    "id": document_b,
                    "filename": "privado.pdf",
                    "user_id": user_b_id,
                },
            ],
        )

        connection.execute(
            text("""
                INSERT INTO document_chunks (
                    id,
                    document_id,
                    page_number,
                    chunk_index,
                    text,
                    embedding
                )
                VALUES (
                    :id,
                    :document_id,
                    1,
                    :chunk_index,
                    :text,
                    CAST(:embedding AS vector(384))
                );
            """),
            [
                {
                    "id": chunk_a1,
                    "document_id": document_a,
                    "chunk_index": 1,
                    "text": "Python permite desarrollar aplicaciones.",
                    "embedding": make_vector(1.0, 0.0),
                },
                {
                    "id": chunk_a2,
                    "document_id": document_a,
                    "chunk_index": 2,
                    "text": "Información sobre bases de datos.",
                    "embedding": make_vector(0.0, 1.0),
                },
                {
                    "id": chunk_a3,
                    "document_id": document_a2,
                    "chunk_index": 1,
                    "text": "FastAPI permite crear APIs con Python.",
                    "embedding": make_vector(0.8, 0.6),
                },
                {
                    "id": chunk_pending,
                    "document_id": document_a2,
                    "chunk_index": 2,
                    "text": "Fragmento pendiente de procesar.",
                    "embedding": None,
                },
                {
                    "id": chunk_b,
                    "document_id": document_b,
                    "chunk_index": 1,
                    "text": "Información privada de otro usuario.",
                    "embedding": make_vector(1.0, 0.0),
                },
            ],
        )

    try:
        yield {
            "engine": engine,
            "user_a_id": user_a_id,
            "user_b_id": user_b_id,
            "document_a": document_a,
            "document_a2": document_a2,
            "document_b": document_b,
            "chunk_a1": chunk_a1,
            "chunk_a2": chunk_a2,
            "chunk_a3": chunk_a3,
            "chunk_pending": chunk_pending,
            "chunk_b": chunk_b,
        }

    finally:
        with engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM documents
                    WHERE id IN (:a, :a2, :b);
                """),
                {
                    "a": document_a,
                    "a2": document_a2,
                    "b": document_b,
                },
            )

            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:a, :b);
                """),
                {
                    "a": user_a_id,
                    "b": user_b_id,
                },
            )

        engine.dispose()


def test_semantic_search_orders_by_similarity(search_environment):
    data = search_environment

    query_vector = [1.0, 0.0] + [0.0] * 382

    results = semantic_search_repository.search_similar_chunks_for_user(
        user_id=data["user_a_id"],
        query_embedding=query_vector,
        limit=5,
    )

    # Solo aparecen los 3 chunks propios con embeddings
    assert len(results) == 3

    assert [result["chunk_id"] for result in results] == [
        data["chunk_a1"],
        data["chunk_a3"],
        data["chunk_a2"],
    ]

    # Comprobar puntuaciones de similitud
    assert results[0]["similarity"] == pytest.approx(1.0)
    assert results[1]["similarity"] == pytest.approx(0.8)
    assert results[2]["similarity"] == pytest.approx(0.0)

    assert results[0]["filename"] == "python.pdf"
    assert results[0]["page_number"] == 1


def test_semantic_search_filters_document(search_environment):
    data = search_environment

    results = semantic_search_repository.search_similar_chunks_for_user(
        user_id=data["user_a_id"],
        query_embedding=[1.0, 0.0] + [0.0] * 382,
        document_id=data["document_a2"],
    )

    assert len(results) == 1
    assert results[0]["chunk_id"] == data["chunk_a3"]

    # Buscar un documento inexistente no devuelve resultados
    missing = semantic_search_repository.search_similar_chunks_for_user(
        user_id=data["user_a_id"],
        query_embedding=[1.0, 0.0] + [0.0] * 382,
        document_id=uuid4(),
    )

    assert missing == []


def test_semantic_search_protects_other_users(search_environment):
    data = search_environment

    query_vector = [1.0, 0.0] + [0.0] * 382

    # Usuario B solamente encuentra su propio chunk
    results = semantic_search_repository.search_similar_chunks_for_user(
        user_id=data["user_b_id"],
        query_embedding=query_vector,
    )

    assert len(results) == 1
    assert results[0]["chunk_id"] == data["chunk_b"]

    # Usuario B no puede buscar en el documento de A
    unauthorized = semantic_search_repository.search_similar_chunks_for_user(
        user_id=data["user_b_id"],
        query_embedding=query_vector,
        document_id=data["document_a"],
    )

    assert unauthorized == []


def test_semantic_search_rejects_invalid_parameters():
    valid_vector = [1.0] + [0.0] * 383

    # Dimensiones incorrectas
    with pytest.raises(ValueError, match="384"):
        semantic_search_repository.search_similar_chunks_for_user(
            user_id=10,
            query_embedding=[0.1] * 383,
        )

    # Un vector completamente cero no sirve para distancia coseno
    with pytest.raises(ValueError, match="384"):
        semantic_search_repository.search_similar_chunks_for_user(
            user_id=10,
            query_embedding=[0.0] * 384,
        )

    # Usuario inválido
    with pytest.raises(ValueError, match="usuario"):
        semantic_search_repository.search_similar_chunks_for_user(
            user_id=0,
            query_embedding=valid_vector,
        )

    # Límite inválido
    with pytest.raises(ValueError, match="límite"):
        semantic_search_repository.search_similar_chunks_for_user(
            user_id=10,
            query_embedding=valid_vector,
            limit=0,
        )

    # Identificador de documento inválido
    with pytest.raises(ValueError, match="documento"):
        semantic_search_repository.search_similar_chunks_for_user(
            user_id=10,
            query_embedding=valid_vector,
            document_id="documento-invalido",
        )