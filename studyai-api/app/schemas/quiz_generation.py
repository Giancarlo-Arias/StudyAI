from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GeneratedQuizQuestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question_text: str = Field(min_length=1, max_length=1000)
    options: list[str] = Field(min_length=4, max_length=4)
    correct_option: int = Field(strict=True, ge=0, le=3)
    explanation: str = Field(min_length=1, max_length=2000)
    chunk_id: UUID

    @field_validator("question_text", "explanation")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("El texto no puede estar vacío")

        return value

    @field_validator("options")
    @classmethod
    def validate_options(cls, options: list[str]) -> list[str]:
        cleaned = [option.strip() for option in options]

        if any(not option for option in cleaned):
            raise ValueError("Las opciones no pueden estar vacías")

        if len({option.casefold() for option in cleaned}) != 4:
            raise ValueError("Las cuatro opciones deben ser diferentes")

        return cleaned


class GeneratedQuiz(BaseModel):
    model_config = ConfigDict(extra="forbid")

    questions: list[GeneratedQuizQuestion] = Field(
        min_length=1,
        max_length=20,
    )