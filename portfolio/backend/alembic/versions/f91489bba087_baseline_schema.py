"""baseline schema

Revision ID: f91489bba087
Revises: 
Create Date: 2026-09-04 00:43:18.973903

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f91489bba087'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('admin_users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=64), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('failed_login_attempts', sa.Integer(), nullable=False),
    sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
    sa.Column('mfa_secret', sa.String(length=255), nullable=True),
    sa.Column('mfa_enabled', sa.Boolean(), nullable=False),
    sa.Column('mfa_last_totp_counter', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_admin_users_username'), 'admin_users', ['username'], unique=True)
    op.create_table('blocked_ips',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('ip_address', sa.String(length=45), nullable=False),
    sa.Column('reason', sa.String(length=255), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_blocked_ips_ip_address'), 'blocked_ips', ['ip_address'], unique=True)
    op.create_table('contact_messages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('subject', sa.String(length=200), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contact_messages_created_at'), 'contact_messages', ['created_at'], unique=False)
    op.create_table('conversations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_visitor_message_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversations_last_message_at'), 'conversations', ['last_message_at'], unique=False)
    op.create_index(op.f('ix_conversations_status'), 'conversations', ['status'], unique=False)
    op.create_index(op.f('ix_conversations_token_hash'), 'conversations', ['token_hash'], unique=True)
    op.create_table('experiences',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('company', sa.String(length=120), nullable=False),
    sa.Column('role', sa.String(length=120), nullable=False),
    sa.Column('period', sa.String(length=120), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('description_en', sa.Text(), nullable=True),
    sa.Column('company_url', sa.String(length=500), nullable=True),
    sa.Column('logo_url', sa.String(length=500), nullable=True),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('projects',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('description_en', sa.Text(), nullable=True),
    sa.Column('stack', sa.String(length=255), nullable=False),
    sa.Column('repo_url', sa.String(length=500), nullable=True),
    sa.Column('demo_url', sa.String(length=500), nullable=True),
    sa.Column('image_path', sa.String(length=255), nullable=True),
    sa.Column('is_published', sa.Boolean(), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('skills',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('category', sa.String(length=64), nullable=False),
    sa.Column('name', sa.String(length=64), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_skills_category'), 'skills', ['category'], unique=False)
    op.create_table('chat_messages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('conversation_id', sa.Integer(), nullable=False),
    sa.Column('sender', sa.String(length=10), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_messages_conversation_id'), 'chat_messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_chat_messages_created_at'), 'chat_messages', ['created_at'], unique=False)
    op.create_table('mfa_backup_codes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('admin_id', sa.Integer(), nullable=False),
    sa.Column('code_hash', sa.String(length=64), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['admin_id'], ['admin_users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mfa_backup_codes_admin_id'), 'mfa_backup_codes', ['admin_id'], unique=False)
    op.create_index(op.f('ix_mfa_backup_codes_code_hash'), 'mfa_backup_codes', ['code_hash'], unique=True)
    op.create_table('refresh_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('admin_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['admin_id'], ['admin_users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_refresh_tokens_admin_id'), 'refresh_tokens', ['admin_id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token_hash'), 'refresh_tokens', ['token_hash'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_refresh_tokens_token_hash'), table_name='refresh_tokens')
    op.drop_index(op.f('ix_refresh_tokens_admin_id'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    op.drop_index(op.f('ix_mfa_backup_codes_code_hash'), table_name='mfa_backup_codes')
    op.drop_index(op.f('ix_mfa_backup_codes_admin_id'), table_name='mfa_backup_codes')
    op.drop_table('mfa_backup_codes')
    op.drop_index(op.f('ix_chat_messages_created_at'), table_name='chat_messages')
    op.drop_index(op.f('ix_chat_messages_conversation_id'), table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index(op.f('ix_skills_category'), table_name='skills')
    op.drop_table('skills')
    op.drop_table('projects')
    op.drop_table('experiences')
    op.drop_index(op.f('ix_conversations_token_hash'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_status'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_last_message_at'), table_name='conversations')
    op.drop_table('conversations')
    op.drop_index(op.f('ix_contact_messages_created_at'), table_name='contact_messages')
    op.drop_table('contact_messages')
    op.drop_index(op.f('ix_blocked_ips_ip_address'), table_name='blocked_ips')
    op.drop_table('blocked_ips')
    op.drop_index(op.f('ix_admin_users_username'), table_name='admin_users')
    op.drop_table('admin_users')