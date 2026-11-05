from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine


def list_quiz_attempts_for_user(
    quiz_id: UUID,
    user_id: int,
) -> list[dict] | None:
    with get_engine().connect() as connection:
        quiz_exists = connection.execute(
            text("""
                SELECT 1
                FROM quizzes
                WHERE id = :quiz_id
                  AND user_id = :user_id;
            """),
            {
                "quiz_id": quiz_id,
                "user_id": user_id,
            },
        ).scalar_one_or_none()

        if quiz_exists is None:
            return None

        attempts = connection.execute(
            text("""
                SELECT
                    id AS attempt_id,
                    quiz_id,
                    question_count,
                    correct_count,
                    score_percent,
                    submitted_at
                FROM quiz_attempts
                WHERE quiz_id = :quiz_id
                  AND user_id = :user_id
                ORDER BY submitted_at DESC, id DESC
                LIMIT 50;
            """),
            {
                "quiz_id": quiz_id,
                "user_id": user_id,
            },
        ).mappings().all()

    return [dict(attempt) for attempt in attempts]


def get_quiz_attempt_for_user(
    quiz_id: UUID,
    attempt_id: UUID,
    user_id: int,
) -> dict | None:
    with get_engine().connect() as connection:
        # Verificar que el intento pertenece al quiz y al usuario
        attempt = connection.execute(
            text("""
                SELECT
                    qa.id AS attempt_id,
                    qa.quiz_id,
                    qa.question_count,
                    qa.correct_count,
                    qa.score_percent,
                    qa.submitted_at
                FROM quiz_attempts AS qa
                JOIN quizzes AS q
                    ON q.id = qa.quiz_id
                   AND q.user_id = qa.user_id
                WHERE qa.id = :attempt_id
                  AND qa.quiz_id = :quiz_id
                  AND qa.user_id = :user_id;
            """),
            {
                "attempt_id": attempt_id,
                "quiz_id": quiz_id,
                "user_id": user_id,
            },
        ).mappings().first()

        if attempt is None:
            return None

        # Consultar únicamente las respuestas de ese intento
        answers = connection.execute(
            text("""
                SELECT
                    qq.id AS question_id,
                    qq.position,
                    qq.question_text,
                    qq.options,
                    qaa.selected_option,
                    qq.correct_option,
                    qaa.is_correct,
                    qq.explanation
                FROM quiz_attempt_answers AS qaa
                JOIN quiz_questions AS qq
                    ON qq.id = qaa.question_id
                WHERE qaa.attempt_id = :attempt_id
                  AND qq.quiz_id = :quiz_id
                ORDER BY qq.position;
            """),
            {
                "attempt_id": attempt_id,
                "quiz_id": quiz_id,
            },
        ).mappings().all()

    return {
        **dict(attempt),
        "answers": [dict(answer) for answer in answers],
    }