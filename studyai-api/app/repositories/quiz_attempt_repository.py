from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine


def submit_quiz_attempt_for_user(
    quiz_id: UUID,
    user_id: int,
    answers: list[dict],
) -> dict:
    # Validar identificadores
    if not isinstance(quiz_id, UUID):
        raise ValueError("El cuestionario no es válido")

    if type(user_id) is not int or user_id <= 0:
        raise ValueError("El usuario no es válido")

    # Validar cantidad de respuestas
    if (
        not isinstance(answers, list)
        or not 1 <= len(answers) <= 20
    ):
        raise ValueError("La cantidad de respuestas no es válida")

    # Validar las respuestas recibidas
    selected_answers = {}

    for answer in answers:
        if (
            not isinstance(answer, dict)
            or set(answer) != {"question_id", "selected_option"}
        ):
            raise ValueError("El formato de respuesta no es válido")

        question_id = answer["question_id"]
        selected_option = answer["selected_option"]

        if not isinstance(question_id, UUID):
            raise ValueError("El identificador de pregunta no es válido")

        if (
            type(selected_option) is not int
            or not 0 <= selected_option <= 3
        ):
            raise ValueError("La opción seleccionada no es válida")

        if question_id in selected_answers:
            raise ValueError("No se permiten preguntas duplicadas")

        selected_answers[question_id] = selected_option

    with get_engine().begin() as connection:
        # Verificar propiedad del cuestionario
        quiz = connection.execute(
            text("""
                SELECT id
                FROM quizzes
                WHERE id = :quiz_id
                  AND user_id = :user_id
                FOR SHARE;
            """),
            {
                "quiz_id": quiz_id,
                "user_id": user_id,
            },
        ).scalar_one_or_none()

        if quiz is None:
            raise ValueError(
                "Cuestionario no encontrado o no autorizado"
            )

        # Obtener las respuestas correctas desde PostgreSQL
        questions = connection.execute(
            text("""
                SELECT
                    id,
                    correct_option,
                    explanation
                FROM quiz_questions
                WHERE quiz_id = :quiz_id
                ORDER BY position
                FOR SHARE;
            """),
            {"quiz_id": quiz_id},
        ).mappings().all()

        if not questions:
            raise ValueError("El cuestionario no tiene preguntas")

        # Exigir exactamente las preguntas del cuestionario
        expected_ids = {
            question["id"] for question in questions
        }

        if set(selected_answers) != expected_ids:
            raise ValueError(
                "Debes responder todas las preguntas del cuestionario"
            )

        # Calcular resultados
        evaluated_answers = []
        correct_count = 0

        for question in questions:
            selected_option = selected_answers[question["id"]]

            is_correct = (
                selected_option == question["correct_option"]
            )

            if is_correct:
                correct_count += 1

            evaluated_answers.append({
                "question_id": question["id"],
                "selected_option": selected_option,
                "correct_option": question["correct_option"],
                "is_correct": is_correct,
                "explanation": question["explanation"],
            })

        question_count = len(questions)

        score_percent = (
            Decimal(correct_count)
            * Decimal("100")
            / Decimal(question_count)
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

        # Guardar intento
        attempt = connection.execute(
            text("""
                INSERT INTO quiz_attempts (
                    quiz_id,
                    user_id,
                    question_count,
                    correct_count,
                    score_percent
                )
                VALUES (
                    :quiz_id,
                    :user_id,
                    :question_count,
                    :correct_count,
                    :score_percent
                )
                RETURNING id, submitted_at;
            """),
            {
                "quiz_id": quiz_id,
                "user_id": user_id,
                "question_count": question_count,
                "correct_count": correct_count,
                "score_percent": score_percent,
            },
        ).mappings().one()

        # Guardar cada respuesta
        for answer in evaluated_answers:
            connection.execute(
                text("""
                    INSERT INTO quiz_attempt_answers (
                        attempt_id,
                        question_id,
                        selected_option,
                        is_correct
                    )
                    VALUES (
                        :attempt_id,
                        :question_id,
                        :selected_option,
                        :is_correct
                    );
                """),
                {
                    "attempt_id": attempt["id"],
                    "question_id": answer["question_id"],
                    "selected_option": answer["selected_option"],
                    "is_correct": answer["is_correct"],
                },
            )

    return {
        "attempt_id": attempt["id"],
        "quiz_id": quiz_id,
        "question_count": question_count,
        "correct_count": correct_count,
        "score_percent": score_percent,
        "submitted_at": attempt["submitted_at"],
        "answers": evaluated_answers,
    }