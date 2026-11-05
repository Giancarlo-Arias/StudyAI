from uuid import uuid4

import pytest

from app.services import semantic_search_service


def test_search_across_all_documents(monkeypatch):
    vector = [1.0] + [0.0] * 383

    expected_results = [
        {
            "document_id": uuid4(),
            "filename": "python.pdf",
            "page_number": 2,
            "text": "Python permite crear aplicaciones.",
            "similarity": 0.95,
        },
        {
            "document_id": uuid4(),
            "filename": "tecnologia.pdf",
            "page_number": 4,
            "text": "Python es un lenguaje de programación.",
            "similarity": 0.88,
        },
    ]

    calls = []

    def fake_embed_query(question):
        calls.append(("embed", question))
        return vector

    def fake_search(user_id, query_embedding, limit, document_id):
        calls.append((
            "search",
            user_id,
            query_embedding,
            limit,
            document_id,
        ))
        return expected_results

    monkeypatch.setattr(
        semantic_search_service,
        "embed_query",
        fake_embed_query,
    )

    monkeypatch.setattr(
        semantic_search_service,
        "search_similar_chunks_for_user",
        fake_search,
    )

    results = semantic_search_service.search_relevant_chunks_for_user(
        question="  ¿Para qué sirve Python?  ",
        user_id=10,
    )

    assert results == expected_results

    assert calls == [
        ("embed", "¿Para qué sirve Python?"),
        ("search", 10, vector, 5, None),
    ]


def test_search_specific_document(monkeypatch):
    document_id = uuid4()
    vector = [1.0] + [0.0] * 383

    monkeypatch.setattr(
        semantic_search_service,
        "embed_query",
        lambda question: vector,
    )

    def fake_search(user_id, query_embedding, limit, document_id):
        assert user_id == 10
        assert query_embedding == vector
        assert limit == 3
        assert document_id == expected_document_id

        return [
            {
                "document_id": document_id,
                "filename": "seguridad.pdf",
                "page_number": 5,
                "text": "El phishing es una técnica de engaño.",
                "similarity": 0.92,
            }
        ]

    expected_document_id = document_id

    monkeypatch.setattr(
        semantic_search_service,
        "search_similar_chunks_for_user",
        fake_search,
    )

    results = semantic_search_service.search_relevant_chunks_for_user(
        question="¿Qué es phishing?",
        user_id=10,
        limit=3,
        document_id=document_id,
    )

    assert len(results) == 1
    assert results[0]["document_id"] == document_id


def test_search_without_results(monkeypatch):
    monkeypatch.setattr(
        semantic_search_service,
        "embed_query",
        lambda question: [1.0] + [0.0] * 383,
    )

    monkeypatch.setattr(
        semantic_search_service,
        "search_similar_chunks_for_user",
        lambda **kwargs: [],
    )

    results = semantic_search_service.search_relevant_chunks_for_user(
        question="¿Qué es RAG?",
        user_id=10,
    )

    assert results == []


def test_search_rejects_invalid_question(monkeypatch):
    monkeypatch.setattr(
        semantic_search_service,
        "embed_query",
        lambda question: pytest.fail("No debe ejecutarse E5"),
    )

    with pytest.raises(ValueError, match="pregunta"):
        semantic_search_service.search_relevant_chunks_for_user(
            question="   ",
            user_id=10,
        )

    with pytest.raises(ValueError, match="pregunta"):
        semantic_search_service.search_relevant_chunks_for_user(
            question=None,
            user_id=10,
        )


def test_search_rejects_invalid_user_and_limit(monkeypatch):
    monkeypatch.setattr(
        semantic_search_service,
        "embed_query",
        lambda question: pytest.fail("No debe ejecutarse E5"),
    )

    with pytest.raises(ValueError, match="usuario"):
        semantic_search_service.search_relevant_chunks_for_user(
            question="¿Qué es Python?",
            user_id=0,
        )

    with pytest.raises(ValueError, match="usuario"):
        semantic_search_service.search_relevant_chunks_for_user(
            question="¿Qué es Python?",
            user_id=True,
        )

    with pytest.raises(ValueError, match="límite"):
        semantic_search_service.search_relevant_chunks_for_user(
            question="¿Qué es Python?",
            user_id=10,
            limit=0,
        )

    with pytest.raises(ValueError, match="límite"):
        semantic_search_service.search_relevant_chunks_for_user(
            question="¿Qué es Python?",
            user_id=10,
            limit=21,
        )


def test_search_rejects_invalid_document_id(monkeypatch):
    monkeypatch.setattr(
        semantic_search_service,
        "embed_query",
        lambda question: pytest.fail("No debe ejecutarse E5"),
    )

    with pytest.raises(ValueError, match="documento"):
        semantic_search_service.search_relevant_chunks_for_user(
            question="¿Qué es Python?",
            user_id=10,
            document_id="documento-invalido",
        )