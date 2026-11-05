from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class QuizSummary(BaseModel):
    id: UUID
    document_id: UUID
    title: str
    created_at: datetime
    question_count: int


class QuizListResponse(BaseModel):
    quizzes: list[QuizSummary]


class QuizQuestionPublic(BaseModel):
    id: UUID
    position: int
    question_text: str
    options: list[str]


class QuizPublicDetail(BaseModel):
    id: UUID
    document_id: UUID
    title: str
    created_at: datetime
    questions: list[QuizQuestionPublic]


class QuizGenerateRequest(BaseModel):
    document_id: UUID
    title: str = Field(
        default="Cuestionario de estudio",
        max_length=200,
    )
    question_count: int = Field(strict=True, ge=1, le=20)
    difficulty: Literal["facil", "intermedia", "dificil"]

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("El título no puede estar vacío")

        return value


class QuizGenerateResponse(BaseModel):
    quiz_id: UUID


class QuizSubmittedAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_id: UUID
    selected_option: int = Field(strict=True, ge=0, le=3)


class QuizSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answers: list[QuizSubmittedAnswer] = Field(
        min_length=1,
        max_length=20,
    )


class QuizAttemptAnswerReview(BaseModel):
    question_id: UUID
    selected_option: int
    correct_option: int
    is_correct: bool
    explanation: str | None


class QuizSubmitResponse(BaseModel):
    attempt_id: UUID
    quiz_id: UUID
    question_count: int
    correct_count: int
    score_percent: float
    submitted_at: datetime
    answers: list[QuizAttemptAnswerReview]


class QuizAttemptHistoryItem(BaseModel):
    attempt_id: UUID
    quiz_id: UUID
    question_count: int
    correct_count: int
    score_percent: float
    submitted_at: datetime


class QuizAttemptHistoryResponse(BaseModel):
    attempts: list[QuizAttemptHistoryItem]


class QuizAttemptReviewDetail(QuizAttemptAnswerReview):
    position: int
    question_text: str
    options: list[str]


class QuizAttemptDetailResponse(QuizAttemptHistoryItem):
    answers: list[QuizAttemptReviewDetail]