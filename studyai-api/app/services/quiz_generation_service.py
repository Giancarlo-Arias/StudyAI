from uuid import UUID

from app.schemas.quiz_generation import (
    GeneratedQuiz,
    GeneratedQuizQuestion,
    GeminiQuiz,
)


def validate_generated_quiz(
    raw_json: str,
    allowed_chunk_ids: set[UUID],
    expected_count: int,
) -> GeneratedQuiz:
    # Validar la respuesta recibida
    if not isinstance(raw_json, str) or not raw_json.strip():
        raise ValueError("La respuesta de IA está vacía")

    # Validar cantidad solicitada
    if type(expected_count) is not int or not 1 <= expected_count <= 20:
        raise ValueError(
            "La cantidad de preguntas debe estar entre 1 y 20"
        )

    # Los IDs permitidos deben provenir de fragmentos recuperados
    if (
        not isinstance(allowed_chunk_ids, set)
        or not allowed_chunk_ids
        or any(
            not isinstance(chunk_id, UUID)
            for chunk_id in allowed_chunk_ids
        )
    ):
        raise ValueError(
            "Los fragmentos permitidos no son válidos"
        )

    # Validar el formato JSON mediante Pydantic
    quiz = GeneratedQuiz.model_validate_json(raw_json)

    # La IA debe generar la cantidad solicitada
    if len(quiz.questions) != expected_count:
        raise ValueError(
            "La cantidad de preguntas generadas no coincide"
        )

    # No aceptar referencias a chunks fuera del contexto autorizado
    for question in quiz.questions:
        if question.chunk_id not in allowed_chunk_ids:
            raise ValueError(
                "La pregunta referencia un fragmento no permitido"
            )

    return quiz


def validate_generated_quiz_with_answer_text(
    raw_json: str,
    allowed_chunk_ids: set[UUID],
    expected_count: int,
) -> GeneratedQuiz:
    # Validar la respuesta generada por Gemini
    if not isinstance(raw_json, str) or not raw_json.strip():
        raise ValueError("La respuesta de IA está vacía")

    gemini_quiz = GeminiQuiz.model_validate_json(raw_json)

    questions = []

    for question in gemini_quiz.questions:
        # Calcular el índice sin depender de Gemini
        matches = [
            index
            for index, option in enumerate(question.options)
            if option.casefold() == question.correct_answer.casefold()
        ]

        if len(matches) != 1:
            raise ValueError(
                "La respuesta correcta no coincide con las opciones"
            )

        questions.append(
            GeneratedQuizQuestion(
                question_text=question.question_text,
                question_translation_es=question.question_translation_es,
                options=question.options,
                correct_option=matches[0],
                explanation=question.explanation,
                chunk_id=question.chunk_id,
            )
        )

    # Convertir al formato interno existente
    quiz = GeneratedQuiz(questions=questions)

    # Reutilizar las validaciones de cantidad y autorización
    return validate_generated_quiz(
        raw_json=quiz.model_dump_json(),
        allowed_chunk_ids=allowed_chunk_ids,
        expected_count=expected_count,
    )