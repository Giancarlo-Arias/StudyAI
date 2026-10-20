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