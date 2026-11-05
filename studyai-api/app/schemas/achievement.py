from datetime import datetime

from pydantic import BaseModel


class AchievementItem(BaseModel):
    code: str
    title: str
    description: str
    current: int
    target: int
    unlocked: bool
    unlocked_at: datetime | None


class AchievementsResponse(BaseModel):
    achievements: list[AchievementItem]