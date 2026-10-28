from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine
from app.services.document_processing_service import ProcessedDocument


# Insertar un documento y sus chunks dentro de una única transacción
def _save_document_with_chunks(
    document: ProcessedDocument,
    user_id: int | None,
) -> UUID:

    if not document.chunks:
        raise ValueError("El documento no contiene fragmentos")

    with get_engine().begin() as connection:

        result = connection.execute(
            text("""
                INSERT INTO documents (
                    filename,
                    size_bytes,
                    pages_with_text,
                    text_length,
                    user_id
                )
                VALUES (
                    :filename,
                    :size_bytes,
                    :pages_with_text,
                    :text_length,
                    :user_id
                )
                RETURNING id;
            """),
            {
                "filename": document.filename,
                "size_bytes": document.size_bytes,
                "pages_with_text": document.pages_with_text,
                "text_length": document.text_length,
                "user_id": user_id,
            },
        )

        document_id = result.scalar_one()

        chunks_data = [
            {
                "document_id": document_id,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "text": chunk.text,
            }
            for chunk in document.chunks
        ]

        connection.execute(
            text("""
                INSERT INTO document_chunks (
                    document_id,
                    page_number,
                    chunk_index,
                    text
                )
                VALUES (
                    :document_id,
                    :page_number,
                    :chunk_index,
                    :text
                );
            """),
            chunks_data,
        )

    return document_id


# Compatibilidad temporal con el guardado anterior
def save_document(document: ProcessedDocument) -> UUID:
    return _save_document_with_chunks(document, None)


# Guardar un documento perteneciente a un usuario autenticado
def save_document_for_user(
    document: ProcessedDocument,
    user_id: int,
) -> UUID:

    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("ID de usuario inválido")

    return _save_document_with_chunks(document, user_id)


# Listar documentos con paginación
def list_documents(limit: int = 20, offset: int = 0) -> list[dict]:

    with get_engine().connect() as connection:

        result = connection.execute(
            text("""
                SELECT
                    id,
                    filename,
                    size_bytes,
                    pages_with_text,
                    text_length,
                    created_at
                FROM documents
                ORDER BY created_at DESC, id DESC
                LIMIT :limit OFFSET :offset;
            """),
            {
                "limit": limit,
                "offset": offset,
            },
        )

        return [dict(row) for row in result.mappings().all()]


# Consultar un documento específico y paginar sus chunks
def get_document_by_id(
    document_id: UUID,
    limit: int = 20,
    offset: int = 0,
) -> dict | None:

    with get_engine().connect() as connection:

        document = connection.execute(
            text("""
                SELECT
                    id, filename, size_bytes,
                    pages_with_text, text_length, created_at
                FROM documents
                WHERE id = :document_id;
            """),
            {"document_id": document_id},
        ).mappings().one_or_none()

        if document is None:
            return None

        chunk_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks
                WHERE document_id = :document_id;
            """),
            {"document_id": document_id},
        ).scalar_one()

        chunks = connection.execute(
            text("""
                SELECT id, page_number, chunk_index, text
                FROM document_chunks
                WHERE document_id = :document_id
                ORDER BY chunk_index
                LIMIT :limit OFFSET :offset;
            """),
            {
                "document_id": document_id,
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


# Eliminar un documento y sus chunks asociados
def delete_document(document_id: UUID) -> bool:

    with get_engine().begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM documents
                WHERE id = :document_id
                RETURNING id;
            """),
            {"document_id": document_id},
        )

        return result.scalar_one_or_none() is not None