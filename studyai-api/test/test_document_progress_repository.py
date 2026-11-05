from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import document_progress_repository


@pytest.fixture
def document_progress_environment(monkeypatch):
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
        document_progress_repository,
        "get_engine",
        lambda: engine,
    )

    document_a = uuid4()
    document_empty = uuid4()
    document_other = uuid4()

    quiz_a1 = uuid4()
    quiz_a2 = uuid4()
    quiz_other = uuid4()

    now = datetime.now(timezone.utc)

    with engine.begin() as connection:
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
                    "name": f"Usuario documento {index}",
                    "email": (
                        f"doc_progress_{uuid4().hex}@example.com"
                    ),
                },
            ).scalar_one()

            user_ids.append(user_id)

        user_a, user_b = user_ids

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
                    "filename": "documento-activo.pdf",
                    "user_id": user_a,
                },
                {
                    "id": document_empty,
                    "filename": "documento-sin-quizzes.pdf",
                    "user_id": user_a,
                },
                {
                    "id": document_other,
                    "filename": "documento-privado.pdf",
                    "user_id": user_b,
                },
            ],
        )

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
                    "id": quiz_other,
                    "user_id": user_b,
                    "document_id": document_other,
                    "title": "Quiz privado",
                },
            ],
        )

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
                    4,
                    :correct_count,
                    :score_percent,
                    :submitted_at
                );
            """),
            [
                {
                    "quiz_id": quiz_a1,
                    "user_id": user_a,
                    "correct_count": 2,
                    "score_percent": 50,
                    "submitted_at": now - timedelta(hours=3),
                },
                {
                    "quiz_id": quiz_a1,
                    "user_id": user_a,
                    "correct_count": 4,
                    "score_percent": 100,
                    "submitted_at": now - timedelta(hours=2),
                },
                {
                    "quiz_id": quiz_a2,
                    "user_id": user_a,
                    "correct_count": 3,
                    "score_percent": 75,
                    "submitted_at": now - timedelta(hours=1),
                },
                {
                    "quiz_id": quiz_other,
                    "user_id": user_b,
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
            "document_a": document_a,
            "document_empty": document_empty,
            "document_other": document_other,
        }

    finally:
        with engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:user_a, :user_b);
                """),
                {
                    "user_a": user_a,
                    "user_b": user_b,
                },
            )

        engine.dispose()


def test_document_progress_calculates_scores(
    document_progress_environment,
):
    data = document_progress_environment

    result = (
        document_progress_repository
        .list_document_progress_for_user(data["user_a"])
    )

    document = next(
        item
        for item in result
        if item["document_id"] == data["document_a"]
    )

    assert document["total_quizzes"] == 2
    assert document["quizzes_completed"] == 2
    assert document["total_attempts"] == 3

    # Últimos intentos: 100 y 75
    assert float(document["average_score_percent"]) == 87.5
    assert float(document["best_score_percent"]) == 100.0
    assert document["last_attempt_at"] is not None


def test_document_without_quizzes(
    document_progress_environment,
):
    data = document_progress_environment

    result = (
        document_progress_repository
        .list_document_progress_for_user(data["user_a"])
    )

    document = next(
        item
        for item in result
        if item["document_id"] == data["document_empty"]
    )

    assert document["total_quizzes"] == 0
    assert document["quizzes_completed"] == 0
    assert document["total_attempts"] == 0
    assert float(document["average_score_percent"]) == 0.0
    assert float(document["best_score_percent"]) == 0.0
    assert document["last_attempt_at"] is None


def test_document_progress_isolated_by_user(
    document_progress_environment,
):
    data = document_progress_environment

    result = (
        document_progress_repository
        .list_document_progress_for_user(data["user_a"])
    )

    assert len(result) == 2
    assert data["document_other"] not in {
        document["document_id"]
        for document in result
    }