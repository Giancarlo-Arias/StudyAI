from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine
from app.services.document_processing_service import ProcessedDocument


# Guardar un documento y sus fragmentos en una transacción
def save_document(document: ProcessedDocument) -> UUID:

    # Evitar registrar documentos sin contenido procesado
    if not document.chunks:
        raise ValueError("El documento no contiene fragmentos")

    # Iniciar transacción: COMMIT o ROLLBACK automático
    with get_engine().begin() as connection:

        # Insertar los metadatos del documento
        result = connection.execute(
            text("""
                INSERT INTO documents (
                    filename,
                    size_bytes,
                    pages_with_text,
                    text_length
                )
                VALUES (
                    :filename,
                    :size_bytes,
                    :pages_with_text,
                    :text_length
                )
                RETURNING id;
            """),
            {
                "filename": document.filename,
                "size_bytes": document.size_bytes,
                "pages_with_text": document.pages_with_text,
                "text_length": document.text_length
            }
        )

        # Recuperar el UUID generado por PostgreSQL
        document_id = result.scalar_one()

        # Preparar los datos de cada fragmento
        chunks_data = [
            {
                "document_id": document_id,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "text": chunk.text
            }
            for chunk in document.chunks
        ]

        # Insertar todos los fragmentos
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
            chunks_data
        )

    # Devolver el identificador del documento guardado
    return document_id

# Listar documentos con paginación
def list_documents(limit: int = 20, offset: int = 0) -> list[dict]:

    # Abrir una conexión para lectura
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
                "offset": offset
            }
        )

        # Convertir los resultados a diccionarios
        return [dict(row) for row in result.mappings().all()]


# Consultar un documento específico y paginar sus chunks
def get_document_by_id( document_id: UUID, limit: int = 20, offset: int = 0) -> dict | None:

    with get_engine().connect() as connection:

        # Buscar el documento por su UUID
        document = connection.execute(
            text("""
                SELECT
                    id, filename, size_bytes,
                    pages_with_text, text_length, created_at
                FROM documents
                WHERE id = :document_id;
            """),
            {"document_id": document_id}
        ).mappings().one_or_none()

        if document is None:
            return None

        # Contar todos los fragmentos del documento
        chunk_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks
                WHERE document_id = :document_id;
            """),
            {"document_id": document_id}
        ).scalar_one()

        # Recuperar solamente los chunks solicitados
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
                "offset": offset
            }
        ).mappings().all()

        return {
            "document": dict(document),
            "chunks": [dict(chunk) for chunk in chunks],
            "chunk_count": chunk_count,
            "limit": limit,
            "offset": offset
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
            {"document_id": document_id}
        )

        # True si se eliminó, False si no existía
        return result.scalar_one_or_none() is not None