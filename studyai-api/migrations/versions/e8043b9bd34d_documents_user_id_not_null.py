"""documents_user_id_not_null

Revision ID: e8043b9bd34d
Revises: e8f901a2b3c4
Create Date: 2026-10-29 14:28:42.677326

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e8043b9bd34d'
down_revision: Union[str, Sequence[str], None] = 'e8f901a2b3c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "documents",
        "user_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "documents",
        "user_id",
        existing_type=sa.BigInteger(),
        nullable=True,
    )
