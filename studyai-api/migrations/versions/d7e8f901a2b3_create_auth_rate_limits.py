"""create auth rate limits

Revision ID: d7e8f901a2b3
Revises: c6d7e8f901a2
Create Date: 2026-10-26 23:35:00.181759

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e8f901a2b3'
down_revision: Union[str, Sequence[str], None] = 'c6d7e8f901a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crear tabla para controlar solicitudes por IP."""

    op.execute("""
        CREATE TABLE auth_rate_limits (
            ip_address INET NOT NULL,
            action VARCHAR(50) NOT NULL,
            window_started_at TIMESTAMPTZ NOT NULL
                DEFAULT CURRENT_TIMESTAMP,
            request_count INTEGER NOT NULL DEFAULT 1
                CHECK (request_count > 0),

            PRIMARY KEY (ip_address, action)
        );

        CREATE INDEX idx_auth_rate_limits_window
        ON auth_rate_limits (window_started_at);
    """)


def downgrade() -> None:
    """Eliminar la tabla de control de solicitudes."""

    op.execute("""
        DROP TABLE auth_rate_limits;
    """)
