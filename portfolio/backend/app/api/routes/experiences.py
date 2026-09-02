from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, get_db, verify_csrf
from app.core.config import get_settings
from app.schemas.experience import (
    ExperienceCreate,
    ExperienceOut,
    ExperienceUpdate,
)
from app.services import experience_service


router = APIRouter(
    prefix="/api/experiences",
    tags=["Experiences"],
)
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@router.get("", response_model=list[ExperienceOut])
def list_public_experiences(
    db: Session = Depends(get_db),
):
    return experience_service.list_published_experiences(db)


@router.get("/admin", response_model=list[ExperienceOut])
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def list_all_experiences_admin(
    request: Request,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    return experience_service.list_all_experiences(db)


@router.post(
    "",
    response_model=ExperienceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def create_experience(
    request: Request,
    payload: ExperienceCreate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    return experience_service.create_experience(db, payload)


@router.put(
    "/{experience_id}",
    response_model=ExperienceOut,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def update_experience(
    request: Request,
    experience_id: int,
    payload: ExperienceUpdate,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    experience = experience_service.get_experience(
        db,
        experience_id,
    )

    if experience is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found.",
        )

    return experience_service.update_experience(
        db,
        experience,
        payload,
    )


@router.delete(
    "/{experience_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
@limiter.limit(settings.RATE_LIMIT_ADMIN)
def delete_experience(
    request: Request,
    experience_id: int,
    db: Session = Depends(get_db),
    _admin: str = Depends(get_current_admin),
):
    experience = experience_service.get_experience(
        db,
        experience_id,
    )

    if experience is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experience not found.",
        )

    experience_service.delete_experience(
        db,
        experience,
    )

    return None