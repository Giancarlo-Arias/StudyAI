from fastapi import APIRouter, Depends

from app.api.v1.dependencies import get_current_user
from app.repositories.document_progress_repository import (
    list_document_progress_for_user,
)
from app.repositories.progress_repository import (
    get_progress_for_user,
    get_topic_progress_for_user,
)
from app.schemas.progress import (
    DocumentProgressResponse,
    TopicProgressResponse,
    UserProgressResponse,
)


router = APIRouter(
    prefix="/progress",
    tags=["Progress"],
)


@router.get(
    "",
    response_model=UserProgressResponse,
)
def get_my_progress(
    current_user: dict = Depends(get_current_user),
):
    return get_progress_for_user(
        user_id=current_user["id"],
    )


@router.get(
    "/documents",
    response_model=DocumentProgressResponse,
)
def get_my_document_progress(
    current_user: dict = Depends(get_current_user),
):
    documents = list_document_progress_for_user(
        user_id=current_user["id"],
    )

    return {"documents": documents}


@router.get(
    "/topics",
    response_model=TopicProgressResponse,
)
def get_my_topic_progress(
    current_user: dict = Depends(get_current_user),
):
    return get_topic_progress_for_user(
        user_id=current_user["id"],
    )