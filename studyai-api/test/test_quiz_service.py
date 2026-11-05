from uuid import uuid4

import pytest

from app.services import quiz_service


@pytest.fixture
def quiz_environment(monkeypatch):
    document_id = uuid4()
    quiz_id = uuid4()
    generated_quiz = object()
    calls = []

    def fake_generate(**kwargs):
        calls.append(("generate", kwargs))
        return generated_quiz

    def fake_save(**kwargs):
        calls.append(("save", kwargs))
        return quiz_id

    monkeypatch.setattr(
        quiz_service,
        "generate_quiz_for_document",
        fake_generate,
    )

    monkeypatch.setattr(
        quiz_service,
        "save_generated_quiz_for_user",
        fake_save,
    )

    return {
        "document_id": document_id,
        "quiz_id": quiz_id,
        "generated_quiz": generated_quiz,
        "calls": calls,
    }


def test_generate_and_save_quiz(quiz_environment):
    data = quiz_environment

    result = quiz_service.generate_and_save_quiz_for_document(
        document_id=data["document_id"],
        user_id=2,
        title="  Evaluación de tecnología  ",
        question_count=3,
        difficulty="intermedia",
    )

    assert result == data["quiz_id"]

    assert data["calls"][0] == (
        "generate",
        {
            "document_id": data["document_id"],
            "user_id": 2,
            "question_count": 3,
            "difficulty": "intermedia",
        },
    )

    assert data["calls"][1] == (
        "save",
        {
            "document_id": data["document_id"],
            "user_id": 2,
            "title": "Evaluación de tecnología",
            "quiz": data["generated_quiz"],
        },
    )


def test_does_not_save_if_generation_fails(
    quiz_environment,
    monkeypatch,
):
    data = quiz_environment

    def fake_error(**kwargs):
        raise RuntimeError("Error al generar preguntas")

    monkeypatch.setattr(
        quiz_service,
        "generate_quiz_for_document",
        fake_error,
    )

    with pytest.raises(RuntimeError, match="Error al generar"):
        quiz_service.generate_and_save_quiz_for_document(
            document_id=data["document_id"],
            user_id=2,
        )

    assert data["calls"] == []


def test_reject_invalid_title_before_generation(
    quiz_environment,
):
    data = quiz_environment

    with pytest.raises(ValueError, match="título"):
        quiz_service.generate_and_save_quiz_for_document(
            document_id=data["document_id"],
            user_id=2,
            title="   ",
        )

    assert data["calls"] == []


def test_propagates_database_error(
    quiz_environment,
    monkeypatch,
):
    data = quiz_environment

    def fake_database_error(**kwargs):
        raise RuntimeError("Error de PostgreSQL")

    monkeypatch.setattr(
        quiz_service,
        "save_generated_quiz_for_user",
        fake_database_error,
    )

    with pytest.raises(RuntimeError, match="PostgreSQL"):
        quiz_service.generate_and_save_quiz_for_document(
            document_id=data["document_id"],
            user_id=2,
        )

    assert len(data["calls"]) == 1
    assert data["calls"][0][0] == "generate"