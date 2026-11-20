from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class ProgressRecentAttempt(BaseModel):
    attempt_id: UUID
    quiz_id: UUID
    quiz_title: str
    question_count: int
    correct_count: int
    score_percent: float
    submitted_at: datetime


class UserProgressResponse(BaseModel):
    total_quizzes: int
    quizzes_completed: int
    total_attempts: int
    average_score_percent: float
    best_score_percent: float
    recent_attempts: list[ProgressRecentAttempt]


class DocumentProgressItem(BaseModel):
    document_id: UUID
    filename: str
    total_quizzes: int
    quizzes_completed: int
    total_attempts: int
    average_score_percent: float
    best_score_percent: float
    last_attempt_at: datetime | None


class DocumentProgressResponse(BaseModel):
    documents: list[DocumentProgressItem]


class TopicProgressItem(BaseModel):
    document_id: UUID
    filename: str
    topic: str
    questions_evaluated: int
    correct_questions: int
    incorrect_questions: int
    accuracy_percent: float
    status: Literal[
        "insufficient_data",
        "reinforce",
        "review",
        "strong",
    ]


class TopicProgressResponse(BaseModel):
    topics: list[TopicProgressItem]