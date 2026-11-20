from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import quiz_repository
from app.schemas.quiz_generation import GeneratedQuiz


def make_quiz(chunk_ids):
    questions = []

    for index, chunk_id in enumerate(chunk_ids, start=1):
        questions.append({
            "question_text": f"Pregunta educativa {index}",
            "topic": "Fundamentos de Python",
            "options": [
                "Respuesta correcta",
                "Respuesta incorrecta B",
                "Respuesta incorrecta C",
                "Respuesta incorrecta D",
            ],
            "correct_option": 0,
            "explanation": "Explicación de prueba.",
            "chunk_id": str(chunk_id),
        })

    return GeneratedQuiz.model_validate({
        "questions": questions,
    })


@pytest.fixture
def quiz_environment(monkeypatch):
    test_url = get_engine().url.set(
        database="studyai_test_db"
    )

    engine = create_engine(
        test_url,
        pool_pre_ping=True,
    )

    with engine.connect() as connection:
        assert connection.execute(
            text("SELECT current_database()")
        ).scalar_one() == "studyai_test_db"

    monkeypatch.setattr(
        quiz_repository,
        "get_engine",
        lambda: engine,
    )

    document_a = uuid4()
    document_b = uuid4()

    chunk_a = uuid4()
    chunk_b = uuid4()

    with engine.begin() as connection:

        user_a_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Usuario A',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {
                "email": f"quiz_a_{uuid4().hex}@example.com",
            },
        ).scalar_one()

        user_b_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Usuario B',
                    :email,
                    'hash-de-prueba',
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {
                "email": f"quiz_b_{uuid4().hex}@example.com",
            },
        ).scalar_one()

        connection.execute(
            text("""
                INSERT INTO documents (
                    id,
                    filename,
                    size_bytes,
                    pages_with_text,
                    text_length,
                    user_id
                )
                VALUES (
                    :id,
                    :filename,
                    100,
                    1,
                    50,
                    :user_id
                );
            """),
            [
                {
                    "id": document_a,
                    "filename": "documento-a.pdf",
                    "user_id": user_a_id,
                },
                {
                    "id": document_b,
                    "filename": "documento-b.pdf",
                    "user_id": user_b_id,
                },
            ],
        )

        connection.execute(
            text("""
                INSERT INTO document_chunks (
                    id,
                    document_id,
                    page_number,
                    chunk_index,
                    text
                )
                VALUES (
                    :id,
                    :document_id,
                    1,
                    1,
                    :text
                );
            """),
            [
                {
                    "id": chunk_a,
                    "document_id": document_a,
                    "text": "Contenido del usuario A.",
                },
                {
                    "id": chunk_b,
                    "document_id": document_b,
                    "text": "Contenido del usuario B.",
                },
            ],
        )

    try:
        yield {
            "engine": engine,
            "user_a_id": user_a_id,
            "user_b_id": user_b_id,
            "document_a": document_a,
            "document_b": document_b,
            "chunk_a": chunk_a,
            "chunk_b": chunk_b,
        }

    finally:
        with engine.begin() as connection:

            # La eliminación de documentos elimina sus quizzes
            # y los chunks mediante las claves foráneas.
            connection.execute(
                text("""
                    DELETE FROM documents
                    WHERE id IN (:document_a, :document_b);
                """),
                {
                    "document_a": document_a,
                    "document_b": document_b,
                },
            )

            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:user_a, :user_b);
                """),
                {
                    "user_a": user_a_id,
                    "user_b": user_b_id,
                },
            )

        engine.dispose()


def test_save_generated_quiz(quiz_environment):
    data = quiz_environment

    quiz = make_quiz([
        data["chunk_a"],
        data["chunk_a"],
    ])

    quiz_id = quiz_repository.save_generated_quiz_for_user(
        document_id=data["document_a"],
        user_id=data["user_a_id"],
        title="Evaluación de Python",
        quiz=quiz,
    )

    assert quiz_id is not None

    with data["engine"].connect() as connection:

        saved_quiz = connection.execute(
            text("""
                SELECT
                    user_id,
                    document_id,
                    title
                FROM quizzes
                WHERE id = :quiz_id;
            """),
            {"quiz_id": quiz_id},
        ).one()

        questions = connection.execute(
            text("""
                SELECT
                    position,
                    chunk_id,
                    question_text,
                    topic,
                    options,
                    correct_option,
                    explanation
                FROM quiz_questions
                WHERE quiz_id = :quiz_id
                ORDER BY position;
            """),
            {"quiz_id": quiz_id},
        ).mappings().all()

    assert saved_quiz.user_id == data["user_a_id"]
    assert saved_quiz.document_id == data["document_a"]
    assert saved_quiz.title == "Evaluación de Python"

    assert len(questions) == 2
    assert [q["position"] for q in questions] == [1, 2]

    assert questions[0]["chunk_id"] == data["chunk_a"]
    assert questions[0]["correct_option"] == 0
    assert questions[0]["topic"] == "Fundamentos de Python"

    assert questions[0]["options"] == [
        "Respuesta correcta",
        "Respuesta incorrecta B",
        "Respuesta incorrecta C",
        "Respuesta incorrecta D",
    ]


def test_cannot_save_quiz_for_other_user_document(
    quiz_environment,
):
    data = quiz_environment

    quiz = make_quiz([data["chunk_b"]])

    with pytest.raises(ValueError, match="Documento"):
        quiz_repository.save_generated_quiz_for_user(
            document_id=data["document_b"],
            user_id=data["user_a_id"],
            title="Quiz no autorizado",
            quiz=quiz,
        )

    with data["engine"].connect() as connection:
        count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM quizzes
                WHERE document_id = :document_id;
            """),
            {"document_id": data["document_b"]},
        ).scalar_one()

    assert count == 0


def test_reject_chunk_from_other_document(
    quiz_environment,
):
    data = quiz_environment

    quiz = make_quiz([data["chunk_b"]])

    with pytest.raises(ValueError, match="chunk"):
        quiz_repository.save_generated_quiz_for_user(
            document_id=data["document_a"],
            user_id=data["user_a_id"],
            title="Quiz inválido",
            quiz=quiz,
        )

    with data["engine"].connect() as connection:
        count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM quizzes
                WHERE document_id = :document_id;
            """),
            {"document_id": data["document_a"]},
        ).scalar_one()

    assert count == 0


def test_quiz_transaction_rollback(quiz_environment):
    data = quiz_environment

    # La primera pregunta es válida.
    # La segunda referencia un chunk de otro usuario.
    quiz = make_quiz([
        data["chunk_a"],
        data["chunk_b"],
    ])

    with pytest.raises(ValueError, match="chunk"):
        quiz_repository.save_generated_quiz_for_user(
            document_id=data["document_a"],
            user_id=data["user_a_id"],
            title="Quiz con error",
            quiz=quiz,
        )

    # Aunque la primera pregunta se insertó,
    # la transacción debe revertirse completamente.
    with data["engine"].connect() as connection:

        quiz_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM quizzes
                WHERE document_id = :document_id;
            """),
            {"document_id": data["document_a"]},
        ).scalar_one()

        question_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM quiz_questions AS qq
                JOIN quizzes AS q ON q.id = qq.quiz_id
                WHERE q.document_id = :document_id;
            """),
            {"document_id": data["document_a"]},
        ).scalar_one()

    assert quiz_count == 0
    assert question_count == 0