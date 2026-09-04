"""add visitor_message_count to conversations

Revision ID: a8b8c6e5e0eb
Revises: f91489bba087
Create Date: 2026-09-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a8b8c6e5e0eb'
down_revision: Union[str, Sequence[str], None] = 'f91489bba087'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'conversations',
        sa.Column('visitor_message_count', sa.Integer(), nullable=False, server_default='0'),
    )
    op.execute(
        """
        UPDATE conversations
        SET visitor_message_count = (
            SELECT COUNT(*)
            FROM chat_messages
            WHERE chat_messages.conversation_id = conversations.id
              AND chat_messages.sender = 'visitor'
        )
        """
    )


def downgrade() -> None:
    op.drop_column('conversations', 'visitor_message_count')