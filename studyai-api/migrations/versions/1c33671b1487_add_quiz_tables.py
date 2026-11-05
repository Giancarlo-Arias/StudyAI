"""add_quiz_tables

Revision ID: 1c33671b1487
Revises: be03f575afc6
Create Date: 2026-11-04 15:30:23.904838
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1c33671b1487"
down_revision: Union[str, Sequence[str], None] = "be03f575afc6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE quizzes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id BIGINT NOT NULL
                REFERENCES users(id) ON DELETE CASCADE,
            document_id UUID NOT NULL
                REFERENCES documents(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE INDEX ix_quizzes_user_created_at
        ON quizzes(user_id, created_at DESC);
    """)

    op.execute("""
        CREATE TABLE quiz_questions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quiz_id UUID NOT NULL
                REFERENCES quizzes(id) ON DELETE CASCADE,
            chunk_id UUID
                REFERENCES document_chunks(id) ON DELETE SET NULL,
            position INTEGER NOT NULL CHECK (position > 0),
            question_text TEXT NOT NULL,
            options JSONB NOT NULL,
            correct_option SMALLINT NOT NULL
                CHECK (correct_option BETWEEN 0 AND 3),
            explanation TEXT,
            UNIQUE (quiz_id, position),
            CONSTRAINT quiz_questions_options_check CHECK (
                jsonb_typeof(options) = 'array'
                AND jsonb_array_length(options) = 4
            )
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE quiz_questions;")
    op.execute("DROP TABLE quizzes;")