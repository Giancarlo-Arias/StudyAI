from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import achievement_repository


@pytest.fixture
def achievement_environment(monkeypatch):
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
        achievement_repository,
        "get_engine",
        lambda: engine,
    )

    document_id = uuid4()
    quiz_ids = [uuid4() for _ in range(5)]
    start_time = datetime.now(timezone.utc) - timedelta(minutes=20)

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
                    "name": f"Usuario logros {index}",
                    "email": (
                        f"achievement_{uuid4().hex}@example.com"
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
                    'logros-test.pdf',
                    100,
                    1,
                    50,
                    :user_id
                );
            """),
            {
                "id": document_id,
                "user_id": user_a,
            },
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
                    "id": quiz_id,
                    "user_id": user_a,
                    "document_id": document_id,
                    "title": f"Quiz {index + 1}",
                }
                for index, quiz_id in enumerate(quiz_ids)
            ],
        )

        # Diez intentos, distribuidos en cinco quizzes.
        # El octavo intento obtiene una nota perfecta.
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
                    "quiz_id": quiz_ids[index // 2],
                    "user_id": user_a,
                    "question_count": 3,
                    "correct_count": 3 if index == 7 else 2,
                    "score_percent": 100 if index == 7 else 66.67,
                    "submitted_at": (
                        start_time + timedelta(minutes=index)
                    ),
                }
                for index in range(10)
            ],
        )

    try:
        yield {
            "engine": engine,
            "user_a": user_a,
            "user_b": user_b,
            "start_time": start_time,
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


def test_all_achievements_unlocked(achievement_environment):
    data = achievement_environment

    result = achievement_repository.get_achievements_for_user(
        user_id=data["user_a"],
    )

    achievements = {
        achievement["code"]: achievement
        for achievement in result
    }

    assert len(achievements) == 4

    assert all(
        achievement["unlocked"]
        for achievement in achievements.values()
    )

    assert achievements["first_quiz"]["current"] == 1
    assert achievements["five_quizzes"]["current"] == 5
    assert achievements["ten_attempts"]["current"] == 10
    assert achievements["perfect_score"]["current"] == 1

    assert all(
        achievement["unlocked_at"] is not None
        for achievement in achievements.values()
    )


def test_achievements_with_partial_progress(
    achievement_environment,
):
    data = achievement_environment

    # Conservar seis intentos en tres quizzes.
    # El intento con puntuación perfecta queda eliminado.
    with data["engine"].begin() as connection:
        connection.execute(
            text("""
                DELETE FROM quiz_attempts
                WHERE user_id = :user_id
                  AND submitted_at >= :cutoff;
            """),
            {
                "user_id": data["user_a"],
                "cutoff": (
                    data["start_time"] + timedelta(minutes=6)
                ),
            },
        )

    result = achievement_repository.get_achievements_for_user(
        user_id=data["user_a"],
    )

    achievements = {
        achievement["code"]: achievement
        for achievement in result
    }

    assert achievements["first_quiz"]["unlocked"] is True

    assert achievements["five_quizzes"]["current"] == 3
    assert achievements["five_quizzes"]["unlocked"] is False
    assert achievements["five_quizzes"]["unlocked_at"] is None

    assert achievements["ten_attempts"]["current"] == 6
    assert achievements["ten_attempts"]["unlocked"] is False

    assert achievements["perfect_score"]["current"] == 0
    assert achievements["perfect_score"]["unlocked"] is False


def test_achievements_isolated_by_user(
    achievement_environment,
):
    data = achievement_environment

    result = achievement_repository.get_achievements_for_user(
        user_id=data["user_b"],
    )

    assert len(result) == 4

    assert all(
        achievement["current"] == 0
        and achievement["unlocked"] is False
        and achievement["unlocked_at"] is None
        for achievement in result
    )


@pytest.mark.parametrize("user_id", [0, -1, True, "2"])
def test_reject_invalid_user_id(user_id):
    with pytest.raises(ValueError, match="usuario"):
        achievement_repository.get_achievements_for_user(
            user_id=user_id,
        )