"""
Adds visitor_message_count to conversations. Run once:
    cd backend
    python add_chat_visitor_message_count_column.py
"""
from sqlalchemy import text
from app.db.session import engine

with engine.connect() as conn:
    dialect = conn.dialect.name

    if dialect == "postgresql":
        existing = {
            row[0]
            for row in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='conversations'"
            )).fetchall()
        }
    else:
        existing = {row[1] for row in conn.execute(text("PRAGMA table_info(conversations)")).fetchall()}

    if "visitor_message_count" not in existing:
        conn.execute(text(
            "ALTER TABLE conversations ADD COLUMN visitor_message_count INTEGER NOT NULL DEFAULT 0"
        ))
        conn.execute(text(
            """
            UPDATE conversations
            SET visitor_message_count = (
                SELECT COUNT(*)
                FROM chat_messages
                WHERE chat_messages.conversation_id = conversations.id
                  AND chat_messages.sender = 'visitor'
            )
            """
        ))
        conn.commit()
        print("[migration] coluna visitor_message_count adicionada e preenchida.")
    else:
        print("[migration] coluna visitor_message_count já existe, pulando.")