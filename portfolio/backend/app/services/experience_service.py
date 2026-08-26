from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.experience import Experience
from app.schemas.experience import ExperienceCreate, ExperienceUpdate

def list_published_experiences(db: Session) -> list[Experience]:
    statement = (
        select(Experience)
        .where(Experience.is_published.is_(True))
        .order_by(Experience.display_order, Experience.id)
    )

    return list(db.scalars(statement).all())

def list_all_experiences(db: Session) -> list[Experience]:
    statement = select(Experience).order_by(
        Experience.display_order,
        Experience.id,
    )

    return list(db.scalars(statement).all())

def get_experience(
    db: Session,
    experience_id: int,
) -> Experience | None:
    return db.get(Experience, experience_id)

def create_experience(
    db: Session,
    data: ExperienceCreate,
) -> Experience:
    experience = Experience(**data.model_dump())

    db.add(experience)
    db.commit()
    db.refresh(experience)

    return experience

def update_experience(
    db: Session,
    experience: Experience,
    data: ExperienceUpdate,
) -> Experience:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(experience, field, value)

    db.commit()
    db.refresh(experience)

    return experience

def delete_experience(
    db: Session,
    experience: Experience,
) -> None:
    db.delete(experience)
    db.commit()