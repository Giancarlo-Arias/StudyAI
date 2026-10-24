"""create email verification tokens

Revision ID: c6d7e8f901a2
Revises: b219a7c1d8e2
Create Date: 2026-10-23 21:24:18.780104

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c6d7e8f901a2'
down_revision: Union[str, Sequence[str], None] = 'b219a7c1d8e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crear la tabla de tokens de verificación."""

    # Crear tabla de verificación de correos
    op.execute("""
        CREATE TABLE email_verification_tokens (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

            user_id BIGINT NOT NULL UNIQUE
                REFERENCES users(id) ON DELETE CASCADE,

            token_hash VARCHAR(64) NOT NULL UNIQUE
                CHECK (token_hash ~ '^[0-9a-f]{64}$'),

            expires_at TIMESTAMPTZ NOT NULL
                DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes'),

            created_at TIMESTAMPTZ NOT NULL
                DEFAULT CURRENT_TIMESTAMP
        );
    """)


def downgrade() -> None:
    """Revertir la creación de la tabla."""

    op.execute("""
        DROP TABLE email_verification_tokens;
    """)