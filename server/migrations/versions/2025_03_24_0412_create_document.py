"""create document

Revision ID: 944eefbf599d
Revises:
Create Date: 2025-03-24 04:12:40.485383+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "944eefbf599d"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table(
        "documents",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("file_url", sa.String(), nullable=False),
        sa.Column("authors", sa.ARRAY(sa.String()), nullable=True),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("abstract", sa.Text(), nullable=True),
        sa.Column("institutions", sa.ARRAY(sa.String()), nullable=True),
        sa.Column("keywords", sa.ARRAY(sa.String()), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("publish_date", sa.DateTime(), nullable=True),
        sa.Column("starter_questions", sa.ARRAY(sa.String()), nullable=True),
        sa.Column("raw_content", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("file_url"),
        sa.UniqueConstraint("filename"),
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table("documents")
    # ### end Alembic commands ###
