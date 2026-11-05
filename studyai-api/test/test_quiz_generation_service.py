import json
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.services.quiz_generation_service import validate_generated_quiz


@pytest.fixture
def quiz_data():
    chunk_id = uuid4()

    question = {
        "question_text": "  ¿Qué es autenticación?  ",
        "options": [
            "Verificar la identidad de un usuario",
            "Eliminar documentos",
            "Crear una base de datos",
            "Generar archivos PDF",
        ],
        "correct_option": 0,
        "explanation": "La autenticación verifica la identidad.",
        "chunk_id": str(chunk_id),
    }

    return {
        "chunk_id": chunk_id,
        "question": question,
    }


def test_validate_generated_quiz_success(quiz_data):
    raw_json = json.dumps({
        "questions": [quiz_data["question"]],
    })

    result = validate_generated_quiz(
        raw_json=raw_json,
        allowed_chunk_ids={quiz_data["chunk_id"]},
        expected_count=1,
    )

    assert len(result.questions) == 1
    assert result.questions[0].question_text == "¿Qué es autenticación?"
    assert result.questions[0].correct_option == 0
    assert result.questions[0].chunk_id == quiz_data["chunk_id"]


def test_reject_wrong_question_count(quiz_data):
    raw_json = json.dumps({
        "questions": [quiz_data["question"]],
    })

    with pytest.raises(ValueError, match="cantidad"):
        validate_generated_quiz(
            raw_json,
            {quiz_data["chunk_id"]},
            expected_count=2,
        )


def test_reject_unauthorized_chunk(quiz_data):
    raw_json = json.dumps({
        "questions": [quiz_data["question"]],
    })

    with pytest.raises(ValueError, match="no permitido"):
        validate_generated_quiz(
            raw_json,
            {uuid4()},
            expected_count=1,
        )


def test_reject_wrong_options_count(quiz_data):
    question = quiz_data["question"].copy()
    question["options"] = ["Primera", "Segunda", "Tercera"]

    with pytest.raises(ValidationError):
        validate_generated_quiz(
            json.dumps({"questions": [question]}),
            {quiz_data["chunk_id"]},
            expected_count=1,
        )


def test_reject_duplicate_options(quiz_data):
    question = quiz_data["question"].copy()
    question["options"] = ["Python", "python", "Java", "C#"]

    with pytest.raises(ValidationError):
        validate_generated_quiz(
            json.dumps({"questions": [question]}),
            {quiz_data["chunk_id"]},
            expected_count=1,
        )


def test_reject_invalid_correct_option(quiz_data):
    question = quiz_data["question"].copy()
    question["correct_option"] = 4

    with pytest.raises(ValidationError):
        validate_generated_quiz(
            json.dumps({"questions": [question]}),
            {quiz_data["chunk_id"]},
            expected_count=1,
        )


def test_reject_invalid_json(quiz_data):
    with pytest.raises(ValidationError):
        validate_generated_quiz(
            "Esto no es JSON",
            {quiz_data["chunk_id"]},
            expected_count=1,
        )