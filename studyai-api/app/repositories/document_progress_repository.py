from sqlalchemy import text

from app.db.connection import get_engine


def list_document_progress_for_user(user_id: int) -> list[dict]:
    if type(user_id) is not int or user_id <= 0:
        raise ValueError("El usuario no es válido")

    with get_engine().connect() as connection:
        rows = connection.execute(
            text("""
                WITH user_quizzes AS (
                    SELECT id, document_id
                    FROM quizzes
                    WHERE user_id = :user_id
                ),
                latest_attempts AS (
                    SELECT DISTINCT ON (qa.quiz_id)
                        qa.quiz_id,
                        qa.score_percent
                    FROM quiz_attempts AS qa
                    JOIN user_quizzes AS q
                        ON q.id = qa.quiz_id
                    WHERE qa.user_id = :user_id
                    ORDER BY
                        qa.quiz_id,
                        qa.submitted_at DESC,
                        qa.id DESC
                ),
                quiz_stats AS (
                    SELECT
                        q.document_id,
                        COUNT(*) AS total_quizzes,
                        COUNT(la.quiz_id) AS quizzes_completed,
                        ROUND(
                            AVG(la.score_percent),
                            2
                        ) AS average_score_percent
                    FROM user_quizzes AS q
                    LEFT JOIN latest_attempts AS la
                        ON la.quiz_id = q.id
                    GROUP BY q.document_id
                ),
                attempt_stats AS (
                    SELECT
                        q.document_id,
                        COUNT(qa.id) AS total_attempts,
                        MAX(qa.score_percent) AS best_score_percent,
                        MAX(qa.submitted_at) AS last_attempt_at
                    FROM user_quizzes AS q
                    LEFT JOIN quiz_attempts AS qa
                        ON qa.quiz_id = q.id
                       AND qa.user_id = :user_id
                    GROUP BY q.document_id
                )
                SELECT
                    d.id AS document_id,
                    d.filename,
                    COALESCE(qs.total_quizzes, 0)
                        AS total_quizzes,
                    COALESCE(qs.quizzes_completed, 0)
                        AS quizzes_completed,
                    COALESCE(ats.total_attempts, 0)
                        AS total_attempts,
                    COALESCE(qs.average_score_percent, 0)
                        AS average_score_percent,
                    COALESCE(ats.best_score_percent, 0)
                        AS best_score_percent,
                    ats.last_attempt_at
                FROM documents AS d
                LEFT JOIN quiz_stats AS qs
                    ON qs.document_id = d.id
                LEFT JOIN attempt_stats AS ats
                    ON ats.document_id = d.id
                WHERE d.user_id = :user_id
                ORDER BY d.filename, d.id
                LIMIT 100;
            """),
            {"user_id": user_id},
        ).mappings().all()

    return [dict(row) for row in rows]