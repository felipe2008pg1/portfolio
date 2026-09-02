from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from app.api.deps import get_current_admin, get_db, verify_csrf
from app.core.config import get_settings
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate
from app.services import project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

@router.get("", response_model=list[ProjectOut])
def list_public_projects(db: Session = Depends(get_db)):
    return project_service.list_published_projects(db)

@router.get("/admin", response_model=list[ProjectOut])
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def list_all_projects_admin(
    request: Request,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    return project_service.list_all_projects(db)

@router.post(
    "",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def create_project(
    request: Request,
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    return project_service.create_project(db, payload)

@router.put("/{project_id}", response_model=ProjectOut, dependencies=[Depends(verify_csrf)])
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def update_project(
    request: Request,
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

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_csrf)])
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def delete_project(
    request: Request,
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