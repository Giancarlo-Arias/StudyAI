from sqlalchemy import text

from app.db.connection import get_engine


def get_achievements_for_user(user_id: int) -> list[dict]:
    if type(user_id) is not int or user_id <= 0:
        raise ValueError("El usuario no es válido")

    with get_engine().connect() as connection:
        summary = connection.execute(
            text("""
                WITH user_attempts AS (
                    SELECT
                        qa.id,
                        qa.quiz_id,
                        qa.question_count,
                        qa.correct_count,
                        qa.submitted_at
                    FROM quiz_attempts AS qa
                    JOIN quizzes AS q
                        ON q.id = qa.quiz_id
                       AND q.user_id = qa.user_id
                    WHERE qa.user_id = :user_id
                ),
                first_completions AS (
                    SELECT
                        quiz_id,
                        MIN(submitted_at) AS first_completed_at
                    FROM user_attempts
                    GROUP BY quiz_id
                )
                SELECT
                    (
                        SELECT COUNT(*)
                        FROM user_attempts
                    ) AS total_attempts,

                    (
                        SELECT COUNT(*)
                        FROM first_completions
                    ) AS quizzes_completed,

                    (
                        SELECT MIN(submitted_at)
                        FROM user_attempts
                    ) AS first_quiz_at,

                    (
                        SELECT MIN(submitted_at)
                        FROM user_attempts
                        WHERE correct_count = question_count
                    ) AS perfect_score_at,

                    (
                        SELECT first_completed_at
                        FROM first_completions
                        ORDER BY first_completed_at, quiz_id
                        LIMIT 1 OFFSET 4
                    ) AS five_quizzes_at,

                    (
                        SELECT submitted_at
                        FROM user_attempts
                        ORDER BY submitted_at, id
                        LIMIT 1 OFFSET 9
                    ) AS ten_attempts_at;
            """),
            {"user_id": user_id},
        ).mappings().one()

    completed = summary["quizzes_completed"]
    attempts = summary["total_attempts"]
    has_perfect_score = summary["perfect_score_at"] is not None

    return [
        {
            "code": "first_quiz",
            "title": "Primer paso",
            "description": "Completa tu primer cuestionario.",
            "current": min(completed, 1),
            "target": 1,
            "unlocked": completed >= 1,
            "unlocked_at": summary["first_quiz_at"],
        },
        {
            "code": "five_quizzes",
            "title": "Estudiante constante",
            "description": "Completa 5 cuestionarios diferentes.",
            "current": min(completed, 5),
            "target": 5,
            "unlocked": completed >= 5,
            "unlocked_at": summary["five_quizzes_at"],
        },
        {
            "code": "ten_attempts",
            "title": "La práctica hace al maestro",
            "description": "Realiza 10 intentos de cuestionarios.",
            "current": min(attempts, 10),
            "target": 10,
            "unlocked": attempts >= 10,
            "unlocked_at": summary["ten_attempts_at"],
        },
        {
            "code": "perfect_score",
            "title": "Puntuación perfecta",
            "description": "Obtén una calificación de 100%.",
            "current": int(has_perfect_score),
            "target": 1,
            "unlocked": has_perfect_score,
            "unlocked_at": summary["perfect_score_at"],
        },
    ]