from uuid import UUID

from app.repositories.quiz_repository import save_generated_quiz_for_user
from app.services.quiz_rag_service import generate_quiz_for_document


def generate_and_save_quiz_for_document(
    document_id: UUID,
    user_id: int,
    title: str = "Cuestionario de estudio",
    question_count: int = 5,
    difficulty: str = "intermedia",
) -> UUID:
    # Validar título antes de consumir la API de Gemini
    if (
        not isinstance(title, str)
        or not title.strip()
        or len(title.strip()) > 200
    ):
        raise ValueError("El título del cuestionario no es válido")

    # Generar preguntas utilizando RAG y Gemini
    quiz = generate_quiz_for_document(
        document_id=document_id,
        user_id=user_id,
        question_count=question_count,
        difficulty=difficulty,
    )

    # Guardar el cuestionario generado en PostgreSQL
    quiz_id = save_generated_quiz_for_user(
        document_id=document_id,
        user_id=user_id,
        title=title.strip(),
        quiz=quiz,
    )

    return quiz_id