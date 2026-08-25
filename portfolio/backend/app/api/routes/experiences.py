from fastapi import APIRouter

router = APIRouter(
    prefix="/api/experiences",
    tags=["Experiences"],
)

@router.get("/")
async def get_experiences():
    return []