"""Create document tables

Revision ID: afe31d178d64
Revises:
"""

from alembic import op


# Identificador único de esta migración
revision = "afe31d178d64"

# Es nuestra primera migración
down_revision = None

branch_labels = None
depends_on = None


# Crear las tablas
def upgrade() -> None:

    # Tabla principal de documentos PDF
    op.execute("""
        CREATE TABLE documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

            filename VARCHAR(255) NOT NULL,

            size_bytes BIGINT NOT NULL
                CHECK (size_bytes > 0),

            pages_with_text INTEGER NOT NULL
                CHECK (pages_with_text > 0),

            text_length INTEGER NOT NULL
                CHECK (text_length > 0),

            created_at TIMESTAMPTZ NOT NULL
                DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Tabla de fragmentos pertenecientes a los documentos
    op.execute("""
        CREATE TABLE document_chunks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

            document_id UUID NOT NULL
                REFERENCES documents(id)
                ON DELETE CASCADE,

            page_number INTEGER NOT NULL
                CHECK (page_number > 0),

            chunk_index INTEGER NOT NULL
                CHECK (chunk_index > 0),

            text TEXT NOT NULL
                CHECK (LENGTH(BTRIM(text)) > 0),

            CONSTRAINT uq_document_chunks_document_chunk_index
                UNIQUE (document_id, chunk_index)
        );
    """)


# Revertir la creación de las tablas
def downgrade() -> None:

    # Eliminar primero los fragmentos
    op.execute("DROP TABLE document_chunks;")

    # Eliminar después los documentos
    op.execute("DROP TABLE documents;")