from sqlalchemy import text

from app.db.connection import get_engine


def get_progress_for_user(user_id: int) -> dict:
    # Validar usuario
    if type(user_id) is not int or user_id <= 0:
        raise ValueError("El usuario no es válido")

    with get_engine().connect() as connection:
        # Calcular estadísticas del estudiante
        summary = connection.execute(
            text("""
                WITH latest_attempts AS (
                    SELECT DISTINCT ON (quiz_id)
                        quiz_id,
                        score_percent
                    FROM quiz_attempts
                    WHERE user_id = :user_id
                    ORDER BY quiz_id, submitted_at DESC, id DESC
                )
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM quizzes
                        WHERE user_id = :user_id
                    ) AS total_quizzes,

                    (
                        SELECT COUNT(*)
                        FROM latest_attempts
                    ) AS quizzes_completed,

                    (
                        SELECT COUNT(*)
                        FROM quiz_attempts
                        WHERE user_id = :user_id
                    ) AS total_attempts,

                    COALESCE(
                        (
                            SELECT ROUND(AVG(score_percent), 2)
                            FROM latest_attempts
                        ),
                        0
                    ) AS average_score_percent,

                    COALESCE(
                        (
                            SELECT MAX(score_percent)
                            FROM quiz_attempts
                            WHERE user_id = :user_id
                        ),
                        0
                    ) AS best_score_percent;
            """),
            {"user_id": user_id},
        ).mappings().one()

        # Recuperar los últimos diez intentos
        recent_attempts = connection.execute(
            text("""
                SELECT
                    qa.id AS attempt_id,
                    qa.quiz_id,
                    q.title AS quiz_title,
                    qa.question_count,
                    qa.correct_count,
                    qa.score_percent,
                    qa.submitted_at
                FROM quiz_attempts AS qa
                JOIN quizzes AS q
                    ON q.id = qa.quiz_id
                   AND q.user_id = qa.user_id
                WHERE qa.user_id = :user_id
                ORDER BY qa.submitted_at DESC, qa.id DESC
                LIMIT 10;
            """),
            {"user_id": user_id},
        ).mappings().all()

    return {
        **dict(summary),
        "recent_attempts": [
            dict(attempt)
            for attempt in recent_attempts
        ],
    }