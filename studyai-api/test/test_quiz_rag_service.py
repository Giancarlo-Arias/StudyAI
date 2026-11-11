import json
from uuid import uuid4

import pytest

from app.services import quiz_rag_service


@pytest.fixture
def quiz_environment(monkeypatch):
    document_id = uuid4()
    chunk_id = uuid4()

    calls = []

    chunks = [
        {
            "chunk_id": chunk_id,
            "document_id": document_id,
            "filename": "tecnologia.pdf",
            "page_number": 7,
            "chunk_index": 1,
            "text": "La autenticación permite verificar la identidad.",
            "similarity": 0.95,
        }
    ]

    question = {
        "question_text": "¿Qué permite la autenticación?",
        "options": [
            "Verificar la identidad",
            "Eliminar archivos",
            "Crear documentos",
            "Modificar servidores",
        ],
        "correct_answer": "Verificar la identidad",
        "explanation": "La autenticación verifica la identidad.",
        "chunk_id": str(chunk_id),
    }

    def fake_search(question, user_id, limit, document_id):
        calls.append(("search", user_id, document_id))
        return chunks

    def fake_generate(prompt):
        calls.append(("generate", prompt))
        return json.dumps({"questions": [question]})

    monkeypatch.setattr(
        quiz_rag_service,
        "search_relevant_chunks_for_user",
        fake_search,
    )

    monkeypatch.setattr(
        quiz_rag_service,
        "generate_quiz_json",
        fake_generate,
    )

    return {
        "document_id": document_id,
        "chunk_id": chunk_id,
        "chunks": chunks,
        "question": question,
        "calls": calls,
    }


def test_generate_quiz_using_rag(quiz_environment):
    data = quiz_environment

    quiz = quiz_rag_service.generate_quiz_for_document(
        document_id=data["document_id"],
        user_id=2,
        question_count=1,
        difficulty="facil",
    )

    assert len(quiz.questions) == 1

    assert (
        quiz.questions[0].options[
            quiz.questions[0].correct_option
        ] == "Verificar la identidad"
    )

    assert quiz.questions[0].chunk_id == data["chunk_id"]

    assert data["calls"][0] == (
        "search",
        2,
        data["document_id"],
    )

    assert str(data["chunk_id"]) in data["calls"][1][1]
    assert "La autenticación permite" in data["calls"][1][1]


def test_reject_document_without_chunks(
    quiz_environment,
    monkeypatch,
):
    monkeypatch.setattr(
        quiz_rag_service,
        "search_relevant_chunks_for_user",
        lambda **kwargs: [],
    )

    with pytest.raises(ValueError, match="fragmentos"):
        quiz_rag_service.generate_quiz_for_document(
            document_id=quiz_environment["document_id"],
            user_id=2,
            question_count=1,
        )

    assert not any(
        call[0] == "generate"
        for call in quiz_environment["calls"]
    )


def test_reject_unauthorized_chunk_reference(
    quiz_environment,
    monkeypatch,
):
    question = quiz_environment["question"].copy()
    question["chunk_id"] = str(uuid4())

    monkeypatch.setattr(
        quiz_rag_service,
        "generate_quiz_json",
        lambda prompt: json.dumps({"questions": [question]}),
    )

    with pytest.raises(ValueError, match="no permitido"):
        quiz_rag_service.generate_quiz_for_document(
            document_id=quiz_environment["document_id"],
            user_id=2,
            question_count=1,
        )


def test_reject_wrong_generated_question_count(quiz_environment):
    with pytest.raises(ValueError, match="cantidad"):
        quiz_rag_service.generate_quiz_for_document(
            document_id=quiz_environment["document_id"],
            user_id=2,
            question_count=2,
        )


def test_reject_invalid_question_count(quiz_environment):
    with pytest.raises(ValueError, match="cantidad"):
        quiz_rag_service.generate_quiz_for_document(
            document_id=quiz_environment["document_id"],
            user_id=2,
            question_count=0,
        )


def test_reject_invalid_difficulty(quiz_environment):
    with pytest.raises(ValueError, match="dificultad"):
        quiz_rag_service.generate_quiz_for_document(
            document_id=quiz_environment["document_id"],
            user_id=2,
            difficulty="extrema",
        )