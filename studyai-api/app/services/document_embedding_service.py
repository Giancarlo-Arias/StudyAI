from uuid import UUID

from app.repositories.embedding_repository import (
    list_pending_document_chunks_for_user,
    save_chunk_embedding_for_user,
)
from app.services.embedding_service import embed_passages


def generate_and_save_document_embeddings(
    document_id: UUID,
    user_id: int,
    batch_size: int = 16,
) -> int:
    if (
        not isinstance(batch_size, int)
        or isinstance(batch_size, bool)
        or not 1 <= batch_size <= 100
    ):
        raise ValueError("El tamaño del lote debe estar entre 1 y 100")

    total_saved = 0

    while True:
        chunks = list_pending_document_chunks_for_user(
            document_id,
            user_id,
            limit=batch_size,
        )

        if not chunks:
            return total_saved

        embeddings = embed_passages([
            chunk["text"] for chunk in chunks
        ])

        if len(embeddings) != len(chunks):
            raise RuntimeError(
                "La cantidad de embeddings no coincide con los chunks"
            )

        for chunk, embedding in zip(chunks, embeddings):
            saved = save_chunk_embedding_for_user(
                chunk_id=chunk["id"],
                user_id=user_id,
                embedding=embedding,
            )

            if not saved:
                raise RuntimeError(
                    "No se pudo guardar el embedding del chunk"
                )

            total_saved += 1