"""
Script de seed. Executar uma única vez após configurar o .env:

    cd backend
    python seed.py

É seguro rodar mais de uma vez: não duplica o admin nem as skills.
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
    ("Banco de Dados", "SQLite", 0),
    ("Banco de Dados", "MySQL", 1),
    ("Banco de Dados", "PostgreSQL", 2),
    ("Automação", "Pandas", 0),
]


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing_admin = db.query(AdminUser).filter_by(username=settings.ADMIN_USERNAME).first()
        if existing_admin is None:
            admin = AdminUser(
                username=settings.ADMIN_USERNAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
            )
            db.add(admin)
            print(f"[seed] admin '{settings.ADMIN_USERNAME}' criado.")
        else:
            print(f"[seed] admin '{settings.ADMIN_USERNAME}' já existe, pulando.")

        existing_skills = {(s.category, s.name) for s in db.query(Skill).all()}
        for category, name, order in SKILLS_SEED:
            if (category, name) not in existing_skills:
                db.add(Skill(category=category, name=name, display_order=order))
                print(f"[seed] skill '{category} / {name}' criada.")

        db.commit()
        print("[seed] concluído.")
    finally:
        db.close()


if __name__ == "__main__":
    run()