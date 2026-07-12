from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_admin
from app.schemas.skill import SkillCreate, SkillOut, SkillUpdate
from app.services import skill_service

router = APIRouter(prefix="/api/skills", tags=["skills"])


@router.get("", response_model=list[SkillOut])
def list_skills(db: Session = Depends(get_db)):
    return skill_service.list_skills(db)


@router.post("", response_model=SkillOut, status_code=status.HTTP_201_CREATED)
def create_skill(payload: SkillCreate, db: Session = Depends(get_db), _admin: str = Depends(get_current_admin)):
    return skill_service.create_skill(db, payload)


@router.put("/{skill_id}", response_model=SkillOut)
def update_skill(
    skill_id: int, payload: SkillUpdate, db: Session = Depends(get_db), _admin: str = Depends(get_current_admin)
):
    skill = skill_service.get_skill(db, skill_id)
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill não encontrada.")
    return skill_service.update_skill(db, skill, payload)


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_skill(skill_id: int, db: Session = Depends(get_db), _admin: str = Depends(get_current_admin)):
    skill = skill_service.get_skill(db, skill_id)
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill não encontrada.")
    skill_service.delete_skill(db, skill)
    return None