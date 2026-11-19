from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine


def list_quizzes_for_user(user_id: int) -> list[dict]:
    with get_engine().connect() as connection:
        rows = connection.execute(
            text("""
                SELECT
                    q.id,
                    q.document_id,
                    q.title,
                    q.created_at,
                    (
                        SELECT COUNT(*)
                        FROM quiz_questions AS qq
                        WHERE qq.quiz_id = q.id
                    ) AS question_count
                FROM quizzes AS q
                WHERE q.user_id = :user_id
                ORDER BY q.created_at DESC
                LIMIT 50;
            """),
            {"user_id": user_id},
        ).mappings().all()

    return [dict(row) for row in rows]


def get_quiz_for_user(
    quiz_id: UUID,
    user_id: int,
) -> dict | None:
    with get_engine().connect() as connection:
        quiz = connection.execute(
            text("""
                SELECT
                    id,
                    document_id,
                    title,
                    created_at
                FROM quizzes
                WHERE id = :quiz_id
                  AND user_id = :user_id;
            """),
            {
                "quiz_id": quiz_id,
                "user_id": user_id,
            },
        ).mappings().first()

        if quiz is None:
            return None

        questions = connection.execute(
            text("""
                SELECT
                    id,
                    position,
                    question_text,
                    question_translation_es,
                    options
                FROM quiz_questions
                WHERE quiz_id = :quiz_id
                ORDER BY position;
            """),
            {"quiz_id": quiz_id},
        ).mappings().all()

    return {
        **dict(quiz),
        "questions": [dict(question) for question in questions],
    }