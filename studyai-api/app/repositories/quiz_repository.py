import json
from uuid import UUID

from sqlalchemy import text

from app.db.connection import get_engine
from app.schemas.quiz_generation import GeneratedQuiz


def save_generated_quiz_for_user(
    document_id: UUID,
    user_id: int,
    title: str,
    quiz: GeneratedQuiz,
) -> UUID:
    # Validar usuario
    if type(user_id) is not int or user_id <= 0:
        raise ValueError("El usuario no es válido")

    # Validar identificador del documento
    if not isinstance(document_id, UUID):
        raise ValueError("El identificador del documento no es válido")

    # Validar título
    if (
        not isinstance(title, str)
        or not title.strip()
        or len(title.strip()) > 200
    ):
        raise ValueError("El título del cuestionario no es válido")

    # Validar cuestionario
    if not isinstance(quiz, GeneratedQuiz):
        raise ValueError("El cuestionario no es válido")

    with get_engine().begin() as connection:

        # Crear el quiz únicamente si el documento pertenece al usuario
        quiz_id = connection.execute(
            text("""
                INSERT INTO quizzes (
                    user_id,
                    document_id,
                    title
                )
                SELECT
                    d.user_id,
                    d.id,
                    :title
                FROM documents AS d
                WHERE d.id = :document_id
                  AND d.user_id = :user_id
                RETURNING id;
            """),
            {
                "document_id": document_id,
                "user_id": user_id,
                "title": title.strip(),
            },
        ).scalar_one_or_none()

        if quiz_id is None:
            raise ValueError(
                "Documento no encontrado o no autorizado"
            )

        # Guardar las preguntas generadas por IA
        for position, question in enumerate(
            quiz.questions,
            start=1,
        ):
            question_id = connection.execute(
                text("""
                    INSERT INTO quiz_questions (
                        quiz_id,
                        chunk_id,
                        position,
                        question_text,
                        options,
                        correct_option,
                        explanation
                    )
                    SELECT
                        :quiz_id,
                        dc.id,
                        :position,
                        :question_text,
                        CAST(:options AS JSONB),
                        :correct_option,
                        :explanation
                    FROM document_chunks AS dc
                    WHERE dc.id = :chunk_id
                      AND dc.document_id = :document_id
                    RETURNING id;
                """),
                {
                    "quiz_id": quiz_id,
                    "document_id": document_id,
                    "chunk_id": question.chunk_id,
                    "position": position,
                    "question_text": question.question_text,
                    "options": json.dumps(
                        question.options,
                        ensure_ascii=False,
                    ),
                    "correct_option": question.correct_option,
                    "explanation": question.explanation,
                },
            ).scalar_one_or_none()

            if question_id is None:
                raise ValueError(
                    "El chunk no pertenece al documento"
                )

    return quiz_id