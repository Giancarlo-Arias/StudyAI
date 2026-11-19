"""add_quiz_question_translation

Revision ID: 3eb33af6cbd4
Revises: 8c2a7f0b91e3
Create Date: 2026-11-18 23:25:27.895111

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3eb33af6cbd4'
down_revision: Union[str, Sequence[str], None] = '8c2a7f0b91e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE quiz_questions
        ADD COLUMN question_translation_es TEXT;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE quiz_questions
        DROP COLUMN question_translation_es;
    """)
