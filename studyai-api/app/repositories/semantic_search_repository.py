import math
from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine


EMBEDDING_DIMENSIONS = 384


def search_similar_chunks_for_user(
    user_id: int,
    query_embedding: list[float],
    limit: int = 5,
    document_id: UUID | None = None,
) -> list[dict]:
    # Validar usuario
    if (
        not isinstance(user_id, int)
        or isinstance(user_id, bool)
        or user_id <= 0
    ):
        raise ValueError("El usuario no es válido")

    # Validar el embedding de la pregunta
    if (
        not isinstance(query_embedding, list)
        or len(query_embedding) != EMBEDDING_DIMENSIONS
        or any(
            not isinstance(value, (int, float))
            or isinstance(value, bool)
            or not math.isfinite(value)
            for value in query_embedding
        )
        or not any(value != 0 for value in query_embedding)
    ):
        raise ValueError(
            "El embedding debe contener 384 números válidos y no ser cero"
        )

    # Validar cantidad de resultados
    if (
        not isinstance(limit, int)
        or isinstance(limit, bool)
        or not 1 <= limit <= 20
    ):
        raise ValueError("El límite debe estar entre 1 y 20")

    # Validar filtro opcional por documento
    if document_id is not None and not isinstance(document_id, UUID):
        raise ValueError("El identificador del documento no es válido")

    # Convertir los 384 números al formato de pgvector
    vector_value = "[" + ",".join(
        str(float(value)) for value in query_embedding
    ) + "]"

    parameters = {
        "user_id": user_id,
        "query_embedding": vector_value,
        "limit": limit,
    }

    # Agregar un filtro por documento solo si se solicita
    document_filter = ""

    if document_id is not None:
        document_filter = "AND d.id = :document_id"
        parameters["document_id"] = document_id

    with get_engine().connect() as connection:
        results = connection.execute(
            text(f"""
                SELECT
                    dc.id AS chunk_id,
                    d.id AS document_id,
                    d.filename,
                    dc.page_number,
                    dc.chunk_index,
                    dc.text,
                    1 - (
                        dc.embedding <=> CAST(
                            :query_embedding AS vector(384)
                        )
                    ) AS similarity
                FROM document_chunks AS dc
                JOIN documents AS d
                    ON d.id = dc.document_id
                WHERE d.user_id = :user_id
                  AND dc.embedding IS NOT NULL
                  {document_filter}
                ORDER BY
                    dc.embedding <=> CAST(
                        :query_embedding AS vector(384)
                    )
                LIMIT :limit;
            """),
            parameters,
        ).mappings().all()

    return [dict(result) for result in results]