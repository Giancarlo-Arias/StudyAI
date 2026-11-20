import json
from uuid import uuid4

import pytest

from app.services.quiz_generation_service import (
    validate_generated_quiz_with_answer_text,
)


def make_quiz_json(chunk_id, correct_answer):
    return json.dumps(
        {
            "questions": [
                {
                    "question_text": (
                        "¿Qué indica el hallazgo de moléculas orgánicas?"
                    ),
                    "topic": "Moléculas orgánicas y vida",
                    "options": [
                        "Demuestra la existencia de vida.",
                        "Indica un fallo instrumental.",
                        "Es un indicio, pero no demuestra vida.",
                        "Confirma la presencia de océanos.",
                    ],
                    "correct_answer": correct_answer,
                    "explanation": (
                        "Detectar moléculas orgánicas no demuestra "
                        "por sí solo la existencia de vida."
                    ),
                    "chunk_id": str(chunk_id),
                }
            ]
        },
        ensure_ascii=False,
    )


def test_correct_option_is_calculated_from_answer_text():
    chunk_id = uuid4()

    raw_json = make_quiz_json(
        chunk_id,
        "Es un indicio, pero no demuestra vida.",
    )

    quiz = validate_generated_quiz_with_answer_text(
        raw_json=raw_json,
        allowed_chunk_ids={chunk_id},
        expected_count=1,
    )

    assert quiz.questions[0].correct_option == 2
    assert quiz.questions[0].topic == "Moléculas orgánicas y vida"


def test_rejects_correct_answer_not_present_in_options():
    chunk_id = uuid4()

    raw_json = make_quiz_json(
        chunk_id,
        "Respuesta que no existe.",
    )

    with pytest.raises(
        ValueError,
        match="no coincide con las opciones",
    ):
        validate_generated_quiz_with_answer_text(
            raw_json=raw_json,
            allowed_chunk_ids={chunk_id},
            expected_count=1,
        )


def test_rejects_unauthorized_chunk():
    chunk_id = uuid4()

    raw_json = make_quiz_json(
        chunk_id,
        "Es un indicio, pero no demuestra vida.",
    )

    with pytest.raises(
        ValueError,
        match="fragmento no permitido",
    ):
        validate_generated_quiz_with_answer_text(
            raw_json=raw_json,
            allowed_chunk_ids={uuid4()},
            expected_count=1,
        )