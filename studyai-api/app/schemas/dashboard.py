from pydantic import BaseModel

from app.schemas.achievement import AchievementItem
from app.schemas.progress import (
    DocumentProgressItem,
    UserProgressResponse,
)


class DashboardResponse(BaseModel):
    progress: UserProgressResponse
    documents: list[DocumentProgressItem]
    achievements: list[AchievementItem]