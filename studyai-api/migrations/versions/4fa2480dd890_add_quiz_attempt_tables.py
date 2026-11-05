"""add_quiz_attempt_tables

Revision ID: 4fa2480dd890
Revises: 1c33671b1487
Create Date: 2026-11-04 20:17:57.985020
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "4fa2480dd890"
down_revision: Union[str, Sequence[str], None] = "1c33671b1487"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Permitir validar que cada intento pertenece
    # al propietario del cuestionario
    op.execute("""
        ALTER TABLE quizzes
        ADD CONSTRAINT uq_quizzes_id_user_id
        UNIQUE (id, user_id);
    """)

    # Registrar los intentos de cada estudiante
    op.execute("""
        CREATE TABLE quiz_attempts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quiz_id UUID NOT NULL,
            user_id BIGINT NOT NULL,
            question_count INTEGER NOT NULL
                CHECK (question_count > 0),
            correct_count INTEGER NOT NULL
                CHECK (
                    correct_count >= 0
                    AND correct_count <= question_count
                ),
            score_percent NUMERIC(5,2) NOT NULL
                CHECK (
                    score_percent >= 0
                    AND score_percent <= 100
                ),
            submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            CONSTRAINT fk_quiz_attempts_quiz_owner
                FOREIGN KEY (quiz_id, user_id)
                REFERENCES quizzes(id, user_id)
                ON DELETE CASCADE
        );
    """)

    op.execute("""
        CREATE INDEX ix_quiz_attempts_user_submitted_at
        ON quiz_attempts(user_id, submitted_at DESC);
    """)

    # Registrar las respuestas seleccionadas
    op.execute("""
        CREATE TABLE quiz_attempt_answers (
            attempt_id UUID NOT NULL
                REFERENCES quiz_attempts(id)
                ON DELETE CASCADE,

            question_id UUID NOT NULL
                REFERENCES quiz_questions(id)
                ON DELETE CASCADE,

            selected_option SMALLINT NOT NULL
                CHECK (selected_option BETWEEN 0 AND 3),

            is_correct BOOLEAN NOT NULL,

            PRIMARY KEY (attempt_id, question_id)
        );
    """)


def downgrade() -> None:
    op.execute("DROP TABLE quiz_attempt_answers;")
    op.execute("DROP TABLE quiz_attempts;")

    op.execute("""
        ALTER TABLE quizzes
        DROP CONSTRAINT uq_quizzes_id_user_id;
    """)