from uuid import UUID

from app.schemas.quiz_generation import GeneratedQuiz


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
        raise ValueError("La cantidad de preguntas debe estar entre 1 y 20")

    # Los IDs permitidos deben provenir de fragmentos recuperados
    if (
        not isinstance(allowed_chunk_ids, set)
        or not allowed_chunk_ids
        or any(not isinstance(chunk_id, UUID) for chunk_id in allowed_chunk_ids)
    ):
        raise ValueError("Los fragmentos permitidos no son válidos")

    # Validar el formato JSON mediante Pydantic
    quiz = GeneratedQuiz.model_validate_json(raw_json)

    # La IA debe generar la cantidad solicitada
    if len(quiz.questions) != expected_count:
        raise ValueError("La cantidad de preguntas generadas no coincide")

    # No aceptar referencias a chunks fuera del contexto autorizado
    for question in quiz.questions:
        if question.chunk_id not in allowed_chunk_ids:
            raise ValueError(
                "La pregunta referencia un fragmento no permitido"
            )

    return quiz