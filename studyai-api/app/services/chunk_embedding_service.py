from uuid import UUID

from app.repositories.embedding_repository import save_chunk_embedding_for_user
from app.services.embedding_service import embed_passages


def generate_and_save_chunk_embedding(
    chunk_id: UUID,
    user_id: int,
    chunk_text: str,
) -> bool:
    if not isinstance(chunk_text, str) or not chunk_text.strip():
        raise ValueError("El texto del chunk no puede estar vacío")

    embedding = embed_passages([chunk_text])[0]

    return save_chunk_embedding_for_user(
        chunk_id=chunk_id,
        user_id=user_id,
        embedding=embedding,
    )