from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine


# Consultar un documento únicamente si pertenece al usuario
def get_document_for_user(document_id: UUID, user_id: int) -> dict | None:

    with get_engine().connect() as connection:
        document = connection.execute(
            text("""
                SELECT
                    id,
                    filename,
                    size_bytes,
                    pages_with_text,
                    text_length,
                    created_at
                FROM documents
                WHERE id = :document_id
                  AND user_id = :user_id;
            """),
            {
                "document_id": document_id,
                "user_id": user_id,
            },
        ).mappings().one_or_none()

        return dict(document) if document else None


# Listar únicamente los documentos del usuario
def list_documents_for_user(
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:

    if not 1 <= limit <= 100 or offset < 0:
        raise ValueError("Paginación inválida")

    with get_engine().connect() as connection:
        documents = connection.execute(
            text("""
                SELECT
                    id,
                    filename,
                    size_bytes,
                    pages_with_text,
                    text_length,
                    created_at
                FROM documents
                WHERE user_id = :user_id
                ORDER BY created_at DESC, id DESC
                LIMIT :limit OFFSET :offset;
            """),
            {
                "user_id": user_id,
                "limit": limit,
                "offset": offset,
            },
        ).mappings().all()

        return [dict(document) for document in documents]


# Eliminar únicamente un documento del usuario
def delete_document_for_user(document_id: UUID, user_id: int) -> bool:

    with get_engine().begin() as connection:
        deleted_id = connection.execute(
            text("""
                DELETE FROM documents
                WHERE id = :document_id
                  AND user_id = :user_id
                RETURNING id;
            """),
            {
                "document_id": document_id,
                "user_id": user_id,
            },
        ).scalar_one_or_none()

        return deleted_id is not None


# Consultar un documento propio y paginar sus chunks
def get_document_with_chunks_for_user(
    document_id: UUID,
    user_id: int,
    limit: int = 20,
    offset: int = 0,
) -> dict | None:

    if not 1 <= limit <= 100 or offset < 0:
        raise ValueError("Paginación inválida")

    with get_engine().connect() as connection:
        params = {
            "document_id": document_id,
            "user_id": user_id,
        }

        # Verificar que el documento pertenece al usuario
        document = connection.execute(
            text("""
                SELECT
                    id,
                    filename,
                    size_bytes,
                    pages_with_text,
                    text_length,
                    created_at
                FROM documents
                WHERE id = :document_id
                  AND user_id = :user_id;
            """),
            params,
        ).mappings().one_or_none()

        if document is None:
            return None

        # Contar los chunks asociados al documento propio
        chunk_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks AS dc
                JOIN documents AS d ON d.id = dc.document_id
                WHERE d.id = :document_id
                  AND d.user_id = :user_id;
            """),
            params,
        ).scalar_one()

        # Obtener únicamente los chunks solicitados
        chunks = connection.execute(
            text("""
                SELECT
                    dc.id,
                    dc.page_number,
                    dc.chunk_index,
                    dc.text
                FROM document_chunks AS dc
                JOIN documents AS d ON d.id = dc.document_id
                WHERE d.id = :document_id
                  AND d.user_id = :user_id
                ORDER BY dc.chunk_index
                LIMIT :limit OFFSET :offset;
            """),
            {
                **params,
                "limit": limit,
                "offset": offset,
            },
        ).mappings().all()

        return {
            "document": dict(document),
            "chunks": [dict(chunk) for chunk in chunks],
            "chunk_count": chunk_count,
            "limit": limit,
            "offset": offset,
        }