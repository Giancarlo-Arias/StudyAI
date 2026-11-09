"""create_password_reset_tokens

Revision ID: 42d5cad69d8b
Revises: 4fa2480dd890
Create Date: 2026-11-09 00:10:36.047457

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '42d5cad69d8b'
down_revision: Union[str, Sequence[str], None] = '4fa2480dd890'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Crear tabla para los tokens de recuperación de contraseña.
    op.execute("""
        CREATE TABLE password_reset_tokens (
            user_id BIGINT PRIMARY KEY
                REFERENCES users(id) ON DELETE CASCADE,

            token_hash VARCHAR(64) NOT NULL UNIQUE,

            expires_at TIMESTAMPTZ NOT NULL
                DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 minutes'),

            created_at TIMESTAMPTZ NOT NULL
                DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Optimizar la limpieza de tokens expirados.
    op.execute("""
        CREATE INDEX ix_password_reset_tokens_expires_at
        ON password_reset_tokens (expires_at);
    """)


def downgrade() -> None:
    """Downgrade schema."""

    # Eliminar la tabla y sus índices asociados.
    op.execute("""
        DROP TABLE password_reset_tokens;
    """)