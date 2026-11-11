from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.repositories import quiz_practice_repository
from app.schemas.quiz_api import QuizPracticeCheckRequest


def mock_database(monkeypatch, row):
    # Simular una conexión y el resultado de PostgreSQL.
    connection = MagicMock()

    connection.execute.return_value.mappings.return_value.one_or_none.return_value = row

    engine = MagicMock()
    engine.connect.return_value.__enter__.return_value = connection

    monkeypatch.setattr(
        quiz_practice_repository,
        "get_engine",
        lambda: engine,
    )

    return connection


@pytest.mark.parametrize(
    "selected_option, expected_correct",
    [
        (2, True),
        (1, False),
    ],
)
def test_check_practice_answer(
    monkeypatch,
    selected_option,
    expected_correct,
):
    quiz_id = uuid4()
    question_id = uuid4()

    connection = mock_database(
        monkeypatch,
        {
            "correct_option": 2,
            "explanation": "Explicación de prueba",
        },
    )

    result = (
        quiz_practice_repository.check_quiz_practice_answer_for_user(
            quiz_id=quiz_id,
            question_id=question_id,
            user_id=1,
            selected_option=selected_option,
        )
    )

    assert result is not None
    assert result["question_id"] == question_id
    assert result["selected_option"] == selected_option
    assert result["correct_option"] == 2
    assert result["is_correct"] is expected_correct
    assert result["explanation"] == "Explicación de prueba"

    # Solo debe ejecutar una consulta de lectura.
    connection.execute.assert_called_once()

    query = str(connection.execute.call_args.args[0]).upper()

    assert "SELECT" in query
    assert "INSERT" not in query
    assert "UPDATE" not in query
    assert "DELETE" not in query

    # La consulta debe restringir el acceso al usuario y la pregunta.
    assert "QUIZ.USER_ID = :USER_ID" in query
    assert "QUESTION.ID = :QUESTION_ID" in query


def test_practice_question_not_found(monkeypatch):
    connection = mock_database(monkeypatch, None)

    result = (
        quiz_practice_repository.check_quiz_practice_answer_for_user(
            quiz_id=uuid4(),
            question_id=uuid4(),
            user_id=1,
            selected_option=0,
        )
    )

    assert result is None

    connection.execute.assert_called_once()


@pytest.mark.parametrize(
    "selected_option",
    [-1, 4, True, "2"],
)
def test_practice_rejects_invalid_option(selected_option):
    with pytest.raises(ValueError):
        quiz_practice_repository.check_quiz_practice_answer_for_user(
            quiz_id=uuid4(),
            question_id=uuid4(),
            user_id=1,
            selected_option=selected_option,
        )


@pytest.mark.parametrize(
    "selected_option",
    [-1, 4, True, "2"],
)
def test_practice_schema_rejects_invalid_option(selected_option):
    with pytest.raises(ValidationError):
        QuizPracticeCheckRequest(
            question_id=uuid4(),
            selected_option=selected_option,
        )


def test_practice_schema_rejects_extra_fields():
    with pytest.raises(ValidationError):
        QuizPracticeCheckRequest(
            question_id=uuid4(),
            selected_option=1,
            correct_option=2,
        )