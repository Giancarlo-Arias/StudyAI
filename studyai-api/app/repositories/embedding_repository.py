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