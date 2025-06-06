"""audio citations

Revision ID: 75b2484de153
Revises: ba50a2b21707
Create Date: 2025-06-05 00:01:16.095282+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "75b2484de153"
down_revision: Union[str, None] = "ba50a2b21707"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "audio_overviews",
        sa.Column("citations", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("audio_overviews", sa.Column("title", sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("audio_overviews", "title")
    op.drop_column("audio_overviews", "citations")
    # ### end Alembic commands ###
