from fastapi import APIRouter, Depends

from app.api.v1.dependencies import get_current_user
from app.schemas.dashboard import DashboardResponse
from app.services.dashboard_service import get_dashboard_for_user


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "",
    response_model=DashboardResponse,
)
def get_my_dashboard(
    current_user: dict = Depends(get_current_user),
):
    return get_dashboard_for_user(
        user_id=current_user["id"],
    )