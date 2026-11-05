from fastapi import APIRouter, Depends

from app.api.v1.dependencies import get_current_user
from app.repositories.achievement_repository import (
    get_achievements_for_user,
)
from app.schemas.achievement import AchievementsResponse


router = APIRouter(
    prefix="/achievements",
    tags=["Achievements"],
)


@router.get(
    "",
    response_model=AchievementsResponse,
)
def get_my_achievements(
    current_user: dict = Depends(get_current_user),
):
    achievements = get_achievements_for_user(
        user_id=current_user["id"],
    )

    return {"achievements": achievements}