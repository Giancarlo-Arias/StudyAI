from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.dependencies import get_current_user

from app.repositories.quiz_attempt_query_repository import (
    get_quiz_attempt_for_user,
    list_quiz_attempts_for_user,
)
from app.repositories.quiz_attempt_repository import (
    submit_quiz_attempt_for_user,
)
from app.repositories.quiz_query_repository import (
    get_quiz_for_user,
    list_quizzes_for_user,
)
from app.schemas.quiz_api import (
    QuizAttemptDetailResponse,
    QuizAttemptHistoryResponse,
    QuizGenerateRequest,
    QuizGenerateResponse,
    QuizListResponse,
    QuizPublicDetail,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.services.quiz_service import (
    generate_and_save_quiz_for_document,
)


router = APIRouter(
    prefix="/quizzes",
    tags=["Quizzes"],
)


@router.get(
    "",
    response_model=QuizListResponse,
)
def list_my_quizzes(
    current_user: dict = Depends(get_current_user),
):
    quizzes = list_quizzes_for_user(
        user_id=current_user["id"],
    )

    return {"quizzes": quizzes}


@router.post(
    "/generate",
    response_model=QuizGenerateResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_my_quiz(
    payload: QuizGenerateRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        quiz_id = generate_and_save_quiz_for_document(
            document_id=payload.document_id,
            user_id=current_user["id"],
            title=payload.title,
            question_count=payload.question_count,
            difficulty=payload.difficulty,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "No se pudo generar un cuestionario válido "
                "con el documento seleccionado"
            ),
        ) from exc

    return {"quiz_id": quiz_id}


@router.get(
    "/{quiz_id}",
    response_model=QuizPublicDetail,
)
def get_my_quiz(
    quiz_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    quiz = get_quiz_for_user(
        quiz_id=quiz_id,
        user_id=current_user["id"],
    )

    if quiz is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cuestionario no encontrado",
        )

    return quiz




@router.post(
    "/{quiz_id}/submit",
    response_model=QuizSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_my_quiz(
    quiz_id: UUID,
    payload: QuizSubmitRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = submit_quiz_attempt_for_user(
            quiz_id=quiz_id,
            user_id=current_user["id"],
            answers=[
                answer.model_dump()
                for answer in payload.answers
            ],
        )

    except ValueError as exc:
        if str(exc) == "Cuestionario no encontrado o no autorizado":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cuestionario no encontrado",
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    return result



@router.get(
    "/{quiz_id}/attempts",
    response_model=QuizAttemptHistoryResponse,
)
def list_my_quiz_attempts(
    quiz_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    attempts = list_quiz_attempts_for_user(
        quiz_id=quiz_id,
        user_id=current_user["id"],
    )

    if attempts is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cuestionario no encontrado",
        )

    return {"attempts": attempts}


@router.get(
    "/{quiz_id}/attempts/{attempt_id}",
    response_model=QuizAttemptDetailResponse,
)
def get_my_quiz_attempt(
    quiz_id: UUID,
    attempt_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    attempt = get_quiz_attempt_for_user(
        quiz_id=quiz_id,
        attempt_id=attempt_id,
        user_id=current_user["id"],
    )

    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intento no encontrado",
        )

    return attempt