"""
Adds the `description_en` column to the `projects` table if it does not already exist.
This is necessary because `Base.metadata.create_all()` does not modify tables that have already been created;
it only creates those that do not exist. Run this once:

    cd backend
    python add_description_en_column.py
"""
from sqlalchemy import text
from app.db.session import engine

with engine.connect() as conn:
    dialect = conn.dialect.name

    if dialect == "postgresql":
        check = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='projects' AND column_name='description_en'"
        )).first()
    else:  # sqlite
        check = None
        cols = conn.execute(text("PRAGMA table_info(projects)")).fetchall()
        if any(col[1] == "description_en" for col in cols):
            check = True

    if check:
        print("[migration] Column description_en already exists; skipping.")
    else:
        conn.execute(text("ALTER TABLE projects ADD COLUMN description_en TEXT"))
        conn.commit()
        print("[migration] column description_added.")