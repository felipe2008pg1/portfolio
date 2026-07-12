from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate

def list_published_projects(db: Session) -> list[Project]:
    stmt = select(Project).where(Project.is_published.is_(True)).order_by(Project.display_order, Project.id)
    return list(db.scalars(stmt).all())

def list_all_projects(db: Session) -> list[Project]:
    stmt = select(Project).order_by(Project.display_order, Project.id)
    return list(db.scalars(stmt).all())

def get_project(db: Session, project_id: int) -> Project | None:
    return db.get(Project, project_id)

def create_project(db: Session, data: ProjectCreate) -> Project:
    project = Project(**data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

def update_project(db: Session, project: Project, data: ProjectUpdate) -> Project:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project

def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()