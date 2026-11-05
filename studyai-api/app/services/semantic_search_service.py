from uuid import UUID

from app.repositories.semantic_search_repository import (
    search_similar_chunks_for_user,
)
from app.services.embedding_service import embed_query


def search_relevant_chunks_for_user(
    question: str,
    user_id: int,
    limit: int = 5,
    document_id: UUID | None = None,
) -> list[dict]:
    # Validar la pregunta
    if not isinstance(question, str) or not question.strip():
        raise ValueError("La pregunta no puede estar vacía")

    # Validar el usuario
    if (
        not isinstance(user_id, int)
        or isinstance(user_id, bool)
        or user_id <= 0
    ):
        raise ValueError("El usuario no es válido")

    # Validar el número de resultados
    if (
        not isinstance(limit, int)
        or isinstance(limit, bool)
        or not 1 <= limit <= 20
    ):
        raise ValueError("El límite debe estar entre 1 y 20")

    # Validar el documento opcional
    if document_id is not None and not isinstance(document_id, UUID):
        raise ValueError("El identificador del documento no es válido")

    # Convertir la pregunta en un embedding de 384 dimensiones
    query_embedding = embed_query(question.strip())

    # Buscar fragmentos de los documentos del usuario
    results = search_similar_chunks_for_user(
        user_id=user_id,
        query_embedding=query_embedding,
        limit=limit,
        document_id=document_id,
    )

    return results