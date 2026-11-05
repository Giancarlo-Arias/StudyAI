from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from app.api.v1.dependencies import get_current_user
from app.schemas.semantic_search import SemanticSearchRequest
from app.services.semantic_search_service import (
    search_relevant_chunks_for_user,
)


router = APIRouter(prefix="/search", tags=["Semantic Search"])


@router.post(
    "",
    status_code=200,
    responses={
        401: {"description": "No autenticado"},
        422: {"description": "Datos inválidos"},
        500: {"description": "Error del servidor"},
    },
)
async def search_chunks(
    payload: SemanticSearchRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        results = await run_in_threadpool(
            search_relevant_chunks_for_user,
            payload.question,
            current_user["id"],
            payload.limit,
            payload.document_id,
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Error interno al buscar documentos",
        ) from exc

    return {
        "question": payload.question,
        "count": len(results),
        "results": results,
    }