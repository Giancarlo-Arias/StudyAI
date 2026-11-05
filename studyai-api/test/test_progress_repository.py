from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import progress_repository


@pytest.fixture
def progress_environment(monkeypatch):
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
        progress_repository,
        "get_engine",
        lambda: engine,
    )

    document_a = uuid4()
    document_b = uuid4()

    quiz_a1 = uuid4()
    quiz_a2 = uuid4()
    quiz_b = uuid4()

    now = datetime.now(timezone.utc)

    with engine.begin() as connection:
        user_ids = []

        # Crear tres usuarios de prueba
        for index in range(3):
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
                    "name": f"Usuario progreso {index}",
                    "email": (
                        f"progress_{uuid4().hex}@example.com"
                    ),
                },
            ).scalar_one()

            user_ids.append(user_id)

        user_a, user_b, user_c = user_ids

        # Crear documentos independientes
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
                    :filename,
                    100,
                    1,
                    50,
                    :user_id
                );
            """),
            [
                {
                    "id": document_a,
                    "filename": "progreso-a.pdf",
                    "user_id": user_a,
                },
                {
                    "id": document_b,
                    "filename": "progreso-b.pdf",
                    "user_id": user_b,
                },
            ],
        )

        # Crear los cuestionarios
        connection.execute(
            text("""
                INSERT INTO quizzes (
                    id,
                    user_id,
                    document_id,
                    title
                )
                VALUES (
                    :id,
                    :user_id,
                    :document_id,
                    :title
                );
            """),
            [
                {
                    "id": quiz_a1,
                    "user_id": user_a,
                    "document_id": document_a,
                    "title": "Quiz A1",
                },
                {
                    "id": quiz_a2,
                    "user_id": user_a,
                    "document_id": document_a,
                    "title": "Quiz A2",
                },
                {
                    "id": quiz_b,
                    "user_id": user_b,
                    "document_id": document_b,
                    "title": "Quiz B",
                },
            ],
        )

        # El usuario A realiza tres intentos en dos quizzes
        # El usuario B realiza un intento independiente
        connection.execute(
            text("""
                INSERT INTO quiz_attempts (
                    quiz_id,
                    user_id,
                    question_count,
                    correct_count,
                    score_percent,
                    submitted_at
                )
                VALUES (
                    :quiz_id,
                    :user_id,
                    :question_count,
                    :correct_count,
                    :score_percent,
                    :submitted_at
                );
            """),
            [
                {
                    "quiz_id": quiz_a1,
                    "user_id": user_a,
                    "question_count": 4,
                    "correct_count": 2,
                    "score_percent": 50,
                    "submitted_at": now - timedelta(hours=3),
                },
                {
                    "quiz_id": quiz_a1,
                    "user_id": user_a,
                    "question_count": 4,
                    "correct_count": 4,
                    "score_percent": 100,
                    "submitted_at": now - timedelta(hours=2),
                },
                {
                    "quiz_id": quiz_a2,
                    "user_id": user_a,
                    "question_count": 4,
                    "correct_count": 3,
                    "score_percent": 75,
                    "submitted_at": now - timedelta(hours=1),
                },
                {
                    "quiz_id": quiz_b,
                    "user_id": user_b,
                    "question_count": 4,
                    "correct_count": 1,
                    "score_percent": 25,
                    "submitted_at": now,
                },
            ],
        )

    try:
        yield {
            "engine": engine,
            "user_a": user_a,
            "user_b": user_b,
            "user_c": user_c,
            "quiz_a1": quiz_a1,
            "quiz_a2": quiz_a2,
            "quiz_b": quiz_b,
        }

    finally:
        # Eliminar usuarios y sus datos asociados
        with engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:user_a, :user_b, :user_c);
                """),
                {
                    "user_a": user_a,
                    "user_b": user_b,
                    "user_c": user_c,
                },
            )

        engine.dispose()


def test_progress_uses_latest_attempt_per_quiz(
    progress_environment,
):
    data = progress_environment

    result = progress_repository.get_progress_for_user(
        user_id=data["user_a"],
    )

    assert result["total_quizzes"] == 2
    assert result["quizzes_completed"] == 2
    assert result["total_attempts"] == 3

    # Últimas notas: 100 y 75
    # Promedio: 87.50
    assert float(result["average_score_percent"]) == 87.5
    assert float(result["best_score_percent"]) == 100.0

    assert len(result["recent_attempts"]) == 3
    assert result["recent_attempts"][0]["quiz_id"] == (
        data["quiz_a2"]
    )


def test_progress_without_activity(progress_environment):
    data = progress_environment

    result = progress_repository.get_progress_for_user(
        user_id=data["user_c"],
    )

    assert result["total_quizzes"] == 0
    assert result["quizzes_completed"] == 0
    assert result["total_attempts"] == 0
    assert float(result["average_score_percent"]) == 0.0
    assert float(result["best_score_percent"]) == 0.0
    assert result["recent_attempts"] == []


def test_progress_isolated_by_user(progress_environment):
    data = progress_environment

    result = progress_repository.get_progress_for_user(
        user_id=data["user_b"],
    )

    assert result["total_quizzes"] == 1
    assert result["quizzes_completed"] == 1
    assert result["total_attempts"] == 1
    assert float(result["average_score_percent"]) == 25.0
    assert float(result["best_score_percent"]) == 25.0

    assert len(result["recent_attempts"]) == 1
    assert result["recent_attempts"][0]["quiz_id"] == (
        data["quiz_b"]
    )