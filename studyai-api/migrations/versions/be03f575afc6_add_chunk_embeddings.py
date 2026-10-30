"""add_chunk_embeddings

Revision ID: be03f575afc6
Revises: e8043b9bd34d
Create Date: 2026-10-29 19:33:59.840224

"""
from typing import Sequence, Union

from alembic import op



# revision identifiers, used by Alembic.
revision: str = 'be03f575afc6'
down_revision: Union[str, Sequence[str], None] = 'e8043b9bd34d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Activar la extensión pgvector
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # Agregar la columna para almacenar embeddings
    op.execute("""
        ALTER TABLE document_chunks
        ADD COLUMN embedding vector(384);
    """)


def downgrade() -> None:
    # Eliminar la columna de embeddings
    op.execute("""
        ALTER TABLE document_chunks
        DROP COLUMN embedding;
    """)
