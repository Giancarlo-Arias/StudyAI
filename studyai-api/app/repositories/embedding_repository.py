import math
from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine


EMBEDDING_DIMENSIONS = 384


def save_chunk_embedding_for_user(
    chunk_id: UUID,
    user_id: int,
    embedding: list[float],
) -> bool:
    if not isinstance(user_id, int) or isinstance(user_id, bool) or user_id <= 0:
        raise ValueError("El usuario no es válido")

    if not isinstance(chunk_id, UUID):
        raise ValueError("El identificador del chunk no es válido")

    if (
        not isinstance(embedding, list)
        or len(embedding) != EMBEDDING_DIMENSIONS
        or any(
            not isinstance(value, (int, float))
            or isinstance(value, bool)
            or not math.isfinite(value)
            for value in embedding
        )
    ):
        raise ValueError("El embedding debe contener 384 números válidos")

    vector_value = "[" + ",".join(str(float(value)) for value in embedding) + "]"

    with get_engine().begin() as connection:
        updated_id = connection.execute(
            text("""
                UPDATE document_chunks AS dc
                SET embedding = CAST(:embedding AS vector(384))
                FROM documents AS d
                WHERE dc.document_id = d.id
                  AND dc.id = :chunk_id
                  AND d.user_id = :user_id
                RETURNING dc.id;
            """),
            {
                "embedding": vector_value,
                "chunk_id": chunk_id,
                "user_id": user_id,
            },
        ).scalar_one_or_none()

    return updated_id is not None


def list_pending_document_chunks_for_user(
    document_id: UUID,
    user_id: int,
    limit: int = 16,
) -> list[dict]:
    if not isinstance(document_id, UUID):
        raise ValueError("El identificador del documento no es válido")

    if not isinstance(user_id, int) or isinstance(user_id, bool) or user_id <= 0:
        raise ValueError("El usuario no es válido")

    if not isinstance(limit, int) or isinstance(limit, bool) or not 1 <= limit <= 100:
        raise ValueError("El límite debe estar entre 1 y 100")

    with get_engine().connect() as connection:
        chunks = connection.execute(
            text("""
                SELECT
                    dc.id,
                    dc.text
                FROM document_chunks AS dc
                JOIN documents AS d ON d.id = dc.document_id
                WHERE d.id = :document_id
                  AND d.user_id = :user_id
                  AND dc.embedding IS NULL
                ORDER BY dc.page_number, dc.chunk_index, dc.id
                LIMIT :limit;
            """),
            {
                "document_id": document_id,
                "user_id": user_id,
                "limit": limit,
            },
        ).mappings().all()

    return [dict(chunk) for chunk in chunks]