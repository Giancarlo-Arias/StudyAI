from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine


def check_quiz_practice_answer_for_user(
    quiz_id: UUID,
    question_id: UUID,
    user_id: int,
    selected_option: int,
) -> dict | None:
    # Validar identificadores
    if not isinstance(quiz_id, UUID):
        raise ValueError("El cuestionario no es válido")

    if not isinstance(question_id, UUID):
        raise ValueError("La pregunta no es válida")

    if type(user_id) is not int or user_id <= 0:
        raise ValueError("El usuario no es válido")

    # Validar la opción seleccionada
    if (
        type(selected_option) is not int
        or not 0 <= selected_option <= 3
    ):
        raise ValueError("La opción seleccionada no es válida")

    with get_engine().connect() as connection:
        # Consultar únicamente preguntas de cuestionarios
        # pertenecientes al usuario autenticado.
        question = connection.execute(
            text("""
                SELECT
                    question.correct_option,
                    question.explanation
                FROM quiz_questions AS question
                INNER JOIN quizzes AS quiz
                    ON quiz.id = question.quiz_id
                WHERE quiz.id = :quiz_id
                  AND quiz.user_id = :user_id
                  AND question.id = :question_id;
            """),
            {
                "quiz_id": quiz_id,
                "user_id": user_id,
                "question_id": question_id,
            },
        ).mappings().one_or_none()

    if question is None:
        return None

    correct_option = question["correct_option"]

    return {
        "question_id": question_id,
        "selected_option": selected_option,
        "correct_option": correct_option,
        "is_correct": selected_option == correct_option,
        "explanation": question["explanation"],
    }