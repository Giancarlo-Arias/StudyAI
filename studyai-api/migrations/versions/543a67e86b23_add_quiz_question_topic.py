"""add quiz question topic

Revision ID: 543a67e86b23
Revises: 3eb33af6cbd4
Create Date: 2026-11-19 14:26:21.136695

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '543a67e86b23'
down_revision: Union[str, Sequence[str], None] = '3eb33af6cbd4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE quiz_questions
        ADD COLUMN topic VARCHAR(80);
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE quiz_questions
        DROP COLUMN topic;
    """)
