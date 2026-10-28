"""add document ownership

Revision ID: e8f901a2b3c4
Revises: d7e8f901a2b3
Create Date: 2026-10-27 16:45:54.383987

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8f901a2b3c4'
down_revision: Union[str, Sequence[str], None] = 'd7e8f901a2b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE documents
        ADD COLUMN user_id BIGINT
        REFERENCES users(id) ON DELETE CASCADE;

        CREATE INDEX idx_documents_user_id
        ON documents (user_id);
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX idx_documents_user_id;

        ALTER TABLE documents
        DROP COLUMN user_id;
    """)
