"""add conversation message_count

Revision ID: d52fd2f62fee
Revises: f91489bba087
Create Date: 2026-09-04 20:32:27.746687

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd52fd2f62fee'
down_revision: Union[str, Sequence[str], None] = 'f91489bba087'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('conversations', sa.Column('message_count', sa.Integer(), server_default='0', nullable=False))

    # Backfill: existing conversations already have messages that predate
    # this column. Without this, the atomic cap-enforcing UPDATE in
    # add_visitor_message() would see message_count=0 for every existing
    # conversation and let CHAT_MAX_MESSAGES_PER_CONVERSATION be bypassed.
    conn = op.get_bind()
    conn.execute(sa.text(
        """
        UPDATE conversations
        SET message_count = (
            SELECT COUNT(*) FROM chat_messages
            WHERE chat_messages.conversation_id = conversations.id
        )
        """
    ))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('conversations', 'message_count')