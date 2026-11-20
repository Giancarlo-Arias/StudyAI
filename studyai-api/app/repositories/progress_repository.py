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


def get_topic_progress_for_user(user_id: int) -> dict:
    # Validar usuario
    if type(user_id) is not int or user_id <= 0:
        raise ValueError("El usuario no es válido")

    with get_engine().connect() as connection:
        topics = connection.execute(
            text("""
                WITH latest_answers AS (
                    SELECT DISTINCT ON (qaa.question_id)
                        q.document_id,
                        d.filename,
                        TRIM(qq.topic) AS topic,
                        qaa.question_id,
                        qaa.is_correct
                    FROM quiz_attempt_answers AS qaa
                    JOIN quiz_attempts AS qa
                        ON qa.id = qaa.attempt_id
                    JOIN quizzes AS q
                        ON q.id = qa.quiz_id
                       AND q.user_id = qa.user_id
                    JOIN documents AS d
                        ON d.id = q.document_id
                       AND d.user_id = qa.user_id
                    JOIN quiz_questions AS qq
                        ON qq.id = qaa.question_id
                       AND qq.quiz_id = q.id
                    WHERE qa.user_id = :user_id
                      AND qq.topic IS NOT NULL
                      AND TRIM(qq.topic) <> ''
                    ORDER BY
                        qaa.question_id,
                        qa.submitted_at DESC,
                        qa.id DESC
                ),
                topic_stats AS (
                    SELECT
                        document_id,
                        filename,
                        MIN(topic) AS topic,
                        COUNT(*)::INTEGER AS questions_evaluated,
                        COUNT(*) FILTER (
                            WHERE is_correct
                        )::INTEGER AS correct_questions
                    FROM latest_answers
                    GROUP BY
                        document_id,
                        filename,
                        LOWER(topic)
                ),
                topic_results AS (
                    SELECT
                        document_id,
                        filename,
                        topic,
                        questions_evaluated,
                        correct_questions,
                        (
                            questions_evaluated - correct_questions
                        ) AS incorrect_questions,
                        ROUND(
                            100.0 * correct_questions
                            / questions_evaluated,
                            2
                        )::FLOAT AS accuracy_percent
                    FROM topic_stats
                )
                SELECT
                    document_id,
                    filename,
                    topic,
                    questions_evaluated,
                    correct_questions,
                    incorrect_questions,
                    accuracy_percent,
                    CASE
                        WHEN questions_evaluated < 3
                            THEN 'insufficient_data'
                        WHEN accuracy_percent < 60
                            THEN 'reinforce'
                        WHEN accuracy_percent < 85
                            THEN 'review'
                        ELSE 'strong'
                    END AS status
                FROM topic_results
                ORDER BY
                    CASE
                        WHEN questions_evaluated >= 3
                         AND accuracy_percent < 60 THEN 0
                        WHEN questions_evaluated >= 3
                         AND accuracy_percent < 85 THEN 1
                        WHEN questions_evaluated < 3 THEN 2
                        ELSE 3
                    END,
                    accuracy_percent ASC,
                    questions_evaluated DESC;
            """),
            {"user_id": user_id},
        ).mappings().all()

    return {
        "topics": [
            dict(topic)
            for topic in topics
        ],
    }