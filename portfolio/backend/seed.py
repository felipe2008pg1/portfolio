"""
Seed script. Run once after configuring the .env file:

    cd backend
    python seed.py

It is safe to run multiple times: it does not duplicate the admin user
or skills.
"""

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.admin_user import AdminUser
from app.models.skill import Skill

settings = get_settings()

SKILLS_SEED = [
    ("Backend", "Python", 0),
    ("Frontend", "JavaScript", 0),
    ("Frontend", "HTML", 1),
    ("Frontend", "CSS", 2),
    ("Database", "SQLite", 0),
    ("Database", "MySQL", 1),
    ("Database", "PostgreSQL", 2),
    ("Automation", "Pandas", 0),
]

def run() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        existing_admin = (
            db.query(AdminUser)
            .filter_by(username=settings.ADMIN_USERNAME)
            .first()
        )

        if existing_admin is None:
            admin = AdminUser(
                username=settings.ADMIN_USERNAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
            )

            db.add(admin)

            print(f"[seed] admin '{settings.ADMIN_USERNAME}' created.")

        else:
            print(
                f"[seed] admin '{settings.ADMIN_USERNAME}' already exists, skipping."
            )

        existing_skills = {
            (skill.category, skill.name)
            for skill in db.query(Skill).all()
        }

        for category, name, order in SKILLS_SEED:
            if (category, name) not in existing_skills:
                db.add(
                    Skill(
                        category=category,
                        name=name,
                        display_order=order,
                    )
                )

                print(f"[seed] skill '{category} / {name}' created.")

        db.commit()

        print("[seed] completed.")

    finally:
        db.close()

if __name__ == "__main__":
    run()