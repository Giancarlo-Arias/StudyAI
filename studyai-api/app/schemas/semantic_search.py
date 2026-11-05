from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SemanticSearchRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    limit: int = Field(default=5, ge=1, le=20)
    document_id: UUID | None = None

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        question = value.strip()

        if not question:
            raise ValueError("La pregunta no puede estar vacía")

        return question