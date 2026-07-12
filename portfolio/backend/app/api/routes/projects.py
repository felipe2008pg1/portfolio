from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_admin, get_db
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate
from app.services import project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("", response_model=list[ProjectOut])
def list_public_projects(db: Session = Depends(get_db)):
    return project_service.list_published_projects(db)

@router.get("/admin", response_model=list[ProjectOut])
def list_all_projects_admin(
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    return project_service.list_all_projects(db)

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    return project_service.create_project(db, payload)

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    project = project_service.get_project(db, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    return project_service.update_project(db, project, payload)

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    project = project_service.get_project(db, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    project_service.delete_project(db, project)
    return None