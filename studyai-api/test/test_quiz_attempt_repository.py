import json
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import quiz_attempt_repository


@pytest.fixture
def quiz_environment(monkeypatch):
    test_url = get_engine().url.set(
        database="studyai_test_db"
    )

    engine = create_engine(
        test_url,
        pool_pre_ping=True,
    )

    with engine.connect() as connection:
        assert connection.execute(
            text("SELECT current_database()")
        ).scalar_one() == "studyai_test_db"

    monkeypatch.setattr(
        quiz_attempt_repository,
        "get_engine",
        lambda: engine,
    )

    document_id = uuid4()
    chunk_id = uuid4()
    quiz_id = uuid4()
    other_quiz_id = uuid4()

    question_ids = [uuid4() for _ in range(3)]
    other_question_id = uuid4()

    with engine.begin() as connection:
        # Crear dos usuarios independientes
        user_ids = []

        for index in range(2):
            user_id = connection.execute(
                text("""
                    INSERT INTO users (
                        full_name,
                        email,
                        password_hash,
                        is_active,
                        email_verified_at
                    )
                    VALUES (
                        :name,
                        :email,
                        'hash-de-prueba',
                        TRUE,
                        NOW()
                    )
                    RETURNING id;
                """),
                {
                    "name": f"Usuario de prueba {index}",
                    "email": (
                        f"quiz_attempt_{uuid4().hex}@example.com"
                    ),
                },
            ).scalar_one()

            user_ids.append(user_id)

        user_a_id, user_b_id = user_ids

        connection.execute(
            text("""
                INSERT INTO documents (
                    id,
                    filename,
                    size_bytes,
                    pages_with_text,
                    text_length,
                    user_id
                )
                VALUES (
                    :id,
                    'quiz-test.pdf',
                    100,
                    1,
                    50,
                    :user_id
                );
            """),
            {
                "id": document_id,
                "user_id": user_a_id,
            },
        )

        connection.execute(
            text("""
                INSERT INTO document_chunks (
                    id,
                    document_id,
                    page_number,
                    chunk_index,
                    text
                )
                VALUES (
                    :id,
                    :document_id,
                    1,
                    1,
                    'Contenido educativo de prueba'
                );
            """),
            {
                "id": chunk_id,
                "document_id": document_id,
            },
        )

        # Dos quizzes del mismo usuario para comprobar
        # que no se mezclen las preguntas
        connection.execute(
            text("""
                INSERT INTO quizzes (
                    id,
                    user_id,
                    document_id,
                    title
                )
                VALUES (
                    :quiz_id,
                    :user_id,
                    :document_id,
                    :title
                );
            """),
            [
                {
                    "quiz_id": quiz_id,
                    "user_id": user_a_id,
                    "document_id": document_id,
                    "title": "Quiz principal",
                },
                {
                    "quiz_id": other_quiz_id,
                    "user_id": user_a_id,
                    "document_id": document_id,
                    "title": "Otro quiz",
                },
            ],
        )

        for position, question_id in enumerate(
            question_ids,
            start=1,
        ):
            connection.execute(
                text("""
                    INSERT INTO quiz_questions (
                        id,
                        quiz_id,
                        chunk_id,
                        position,
                        question_text,
                        options,
                        correct_option,
                        explanation
                    )
                    VALUES (
                        :id,
                        :quiz_id,
                        :chunk_id,
                        :position,
                        :question_text,
                        CAST(:options AS JSONB),
                        :correct_option,
                        :explanation
                    );
                """),
                {
                    "id": question_id,
                    "quiz_id": quiz_id,
                    "chunk_id": chunk_id,
                    "position": position,
                    "question_text": f"Pregunta {position}",
                    "options": json.dumps([
                        "Opción A",
                        "Opción B",
                        "Opción C",
                        "Opción D",
                    ]),
                    "correct_option": position - 1,
                    "explanation": f"Explicación {position}",
                },
            )

        connection.execute(
            text("""
                INSERT INTO quiz_questions (
                    id,
                    quiz_id,
                    chunk_id,
                    position,
                    question_text,
                    options,
                    correct_option,
                    explanation
                )
                VALUES (
                    :id,
                    :quiz_id,
                    :chunk_id,
                    1,
                    'Pregunta de otro quiz',
                    CAST(:options AS JSONB),
                    0,
                    'Otra explicación'
                );
            """),
            {
                "id": other_question_id,
                "quiz_id": other_quiz_id,
                "chunk_id": chunk_id,
                "options": json.dumps(["A", "B", "C", "D"]),
            },
        )

    try:
        yield {
            "engine": engine,
            "user_a_id": user_a_id,
            "user_b_id": user_b_id,
            "quiz_id": quiz_id,
            "question_ids": question_ids,
            "other_question_id": other_question_id,
        }

    finally:
        # Las claves foráneas eliminan los datos asociados
        with engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:user_a, :user_b);
                """),
                {
                    "user_a": user_a_id,
                    "user_b": user_b_id,
                },
            )

        engine.dispose()


def make_answers(question_ids):
    return [
        {
            "question_id": question_id,
            "selected_option": selected_option,
        }
        for question_id, selected_option in zip(
            question_ids,
            [0, 1, 3],
        )
    ]


def count_attempts(environment):
    with environment["engine"].connect() as connection:
        return connection.execute(
            text("""
                SELECT COUNT(*)
                FROM quiz_attempts
                WHERE quiz_id = :quiz_id;
            """),
            {"quiz_id": environment["quiz_id"]},
        ).scalar_one()


def test_submit_quiz_and_calculate_score(quiz_environment):
    data = quiz_environment

    result = quiz_attempt_repository.submit_quiz_attempt_for_user(
        quiz_id=data["quiz_id"],
        user_id=data["user_a_id"],
        answers=make_answers(data["question_ids"]),
    )

    assert result["question_count"] == 3
    assert result["correct_count"] == 2
    assert result["score_percent"] == Decimal("66.67")

    assert [
        answer["is_correct"]
        for answer in result["answers"]
    ] == [True, True, False]

    assert result["answers"][2]["correct_option"] == 2

    with data["engine"].connect() as connection:
        saved_attempt = connection.execute(
            text("""
                SELECT
                    question_count,
                    correct_count,
                    score_percent
                FROM quiz_attempts
                WHERE id = :attempt_id;
            """),
            {"attempt_id": result["attempt_id"]},
        ).one()

        saved_answers = connection.execute(
            text("""
                SELECT
                    question_id,
                    selected_option,
                    is_correct
                FROM quiz_attempt_answers
                WHERE attempt_id = :attempt_id;
            """),
            {"attempt_id": result["attempt_id"]},
        ).mappings().all()

    assert saved_attempt.question_count == 3
    assert saved_attempt.correct_count == 2
    assert saved_attempt.score_percent == Decimal("66.67")
    assert len(saved_answers) == 3


def test_allow_multiple_attempts(quiz_environment):
    data = quiz_environment

    first = quiz_attempt_repository.submit_quiz_attempt_for_user(
        quiz_id=data["quiz_id"],
        user_id=data["user_a_id"],
        answers=make_answers(data["question_ids"]),
    )

    second = quiz_attempt_repository.submit_quiz_attempt_for_user(
        quiz_id=data["quiz_id"],
        user_id=data["user_a_id"],
        answers=[
            {"question_id": question_id, "selected_option": index}
            for index, question_id in enumerate(data["question_ids"])
        ],
    )

    assert first["attempt_id"] != second["attempt_id"]
    assert second["score_percent"] == Decimal("100.00")
    assert count_attempts(data) == 2


def test_reject_other_user_quiz(quiz_environment):
    data = quiz_environment

    with pytest.raises(ValueError, match="no autorizado"):
        quiz_attempt_repository.submit_quiz_attempt_for_user(
            quiz_id=data["quiz_id"],
            user_id=data["user_b_id"],
            answers=make_answers(data["question_ids"]),
        )

    assert count_attempts(data) == 0


def test_reject_incomplete_answers(quiz_environment):
    data = quiz_environment

    with pytest.raises(ValueError, match="todas las preguntas"):
        quiz_attempt_repository.submit_quiz_attempt_for_user(
            quiz_id=data["quiz_id"],
            user_id=data["user_a_id"],
            answers=make_answers(data["question_ids"])[:2],
        )

    assert count_attempts(data) == 0


def test_reject_duplicate_question(quiz_environment):
    data = quiz_environment

    answers = make_answers(data["question_ids"])
    answers[1]["question_id"] = answers[0]["question_id"]

    with pytest.raises(ValueError, match="duplicadas"):
        quiz_attempt_repository.submit_quiz_attempt_for_user(
            quiz_id=data["quiz_id"],
            user_id=data["user_a_id"],
            answers=answers,
        )

    assert count_attempts(data) == 0


def test_reject_question_from_another_quiz(quiz_environment):
    data = quiz_environment

    answers = make_answers(data["question_ids"])
    answers[2]["question_id"] = data["other_question_id"]

    with pytest.raises(ValueError, match="todas las preguntas"):
        quiz_attempt_repository.submit_quiz_attempt_for_user(
            quiz_id=data["quiz_id"],
            user_id=data["user_a_id"],
            answers=answers,
        )

    assert count_attempts(data) == 0


@pytest.mark.parametrize(
    "invalid_option",
    [-1, 4, True, "1"],
)
def test_reject_invalid_selected_option(
    quiz_environment,
    invalid_option,
):
    data = quiz_environment

    answers = make_answers(data["question_ids"])
    answers[0]["selected_option"] = invalid_option

    with pytest.raises(ValueError, match="opción"):
        quiz_attempt_repository.submit_quiz_attempt_for_user(
            quiz_id=data["quiz_id"],
            user_id=data["user_a_id"],
            answers=answers,
        )

    assert count_attempts(data) == 0