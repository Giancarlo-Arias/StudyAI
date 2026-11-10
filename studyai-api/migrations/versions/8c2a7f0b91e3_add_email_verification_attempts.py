"""add_email_verification_attempts

Revision ID: 8c2a7f0b91e3
Revises: 42d5cad69d8b
Create Date: 2026-11-09 12:46:03.033724

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "8c2a7f0b91e3"
down_revision: Union[str, Sequence[str], None] = "42d5cad69d8b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Agregar el contador de intentos de verificación."""

    # Guardar cuántos códigos incorrectos ha introducido el usuario.
    op.execute("""
        ALTER TABLE email_verification_tokens
        ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
    """)

    # Impedir valores negativos o superiores al límite permitido.
    op.execute("""
        ALTER TABLE email_verification_tokens
        ADD CONSTRAINT ck_email_verification_failed_attempts
        CHECK (failed_attempts BETWEEN 0 AND 5);
    """)


def downgrade() -> None:
    """Eliminar el contador de intentos de verificación."""

    # Eliminar la restricción del contador.
    op.execute("""
        ALTER TABLE email_verification_tokens
        DROP CONSTRAINT ck_email_verification_failed_attempts;
    """)

    # Eliminar la columna agregada.
    op.execute("""
        ALTER TABLE email_verification_tokens
        DROP COLUMN failed_attempts;
    """)