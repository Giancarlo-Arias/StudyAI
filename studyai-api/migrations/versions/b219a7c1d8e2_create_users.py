"""create users

Revision ID: b219a7c1d8e2
Revises: afe31d178d64
Create Date: 2026-10-22 14:06:16.447160
"""

from typing import Sequence, Union

from alembic import op


# Identificadores de la migración
revision: str = "b219a7c1d8e2"
down_revision: Union[str, Sequence[str], None] = "afe31d178d64"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crear la tabla de usuarios."""

    op.execute("""
        CREATE TABLE users (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

            full_name VARCHAR(150) NOT NULL
                CHECK (LENGTH(BTRIM(full_name)) > 0),

            email VARCHAR(320) NOT NULL
                CHECK (LENGTH(BTRIM(email)) > 0),

            password_hash TEXT NOT NULL
                CHECK (LENGTH(BTRIM(password_hash)) > 0),

            is_active BOOLEAN NOT NULL DEFAULT TRUE,

            email_verified_at TIMESTAMPTZ DEFAULT NULL,

            created_at TIMESTAMPTZ NOT NULL
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMPTZ NOT NULL
                DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Evitar correos duplicados sin importar mayúsculas o espacios
    op.execute("""
        CREATE UNIQUE INDEX ux_users_email_lower
        ON users (LOWER(BTRIM(email)));
    """)


def downgrade() -> None:
    """Revertir la creación de la tabla de usuarios."""

    op.execute("""
        DROP INDEX ux_users_email_lower;
    """)

    op.execute("""
        DROP TABLE users;
    """)