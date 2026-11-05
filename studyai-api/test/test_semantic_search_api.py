from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import semantic_search
from app.main import app


client = TestClient(app)


@pytest.fixture
def authenticated_user():
    app.dependency_overrides[get_current_user] = lambda: {
        "id": 2,
        "email": "usuario@example.com",
    }

    try:
        yield
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_search_all_user_documents(authenticated_user, monkeypatch):
    document_id = uuid4()
    calls = []

    expected_results = [
        {
            "document_id": document_id,
            "filename": "tecnologia.pdf",
            "page_number": 7,
            "text": "La autenticación verifica la identidad.",
            "similarity": 0.91,
        }
    ]

    def fake_search(question, user_id, limit, document_id):
        calls.append((question, user_id, limit, document_id))
        return expected_results

    monkeypatch.setattr(
        semantic_search,
        "search_relevant_chunks_for_user",
        fake_search,
    )

    response = client.post(
        "/api/v1/search",
        json={
            "question": "¿Qué es autenticación?",
        },
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["results"][0]["filename"] == "tecnologia.pdf"

    assert calls == [
        ("¿Qué es autenticación?", 2, 5, None)
    ]


def test_search_specific_document(authenticated_user, monkeypatch):
    document_id = uuid4()
    calls = []

    def fake_search(question, user_id, limit, document_id):
        calls.append((question, user_id, limit, document_id))
        return []

    monkeypatch.setattr(
        semantic_search,
        "search_relevant_chunks_for_user",
        fake_search,
    )

    response = client.post(
        "/api/v1/search",
        json={
            "question": "¿Qué es RAG?",
            "limit": 3,
            "document_id": str(document_id),
        },
    )

    assert response.status_code == 200
    assert response.json()["count"] == 0

    assert calls == [
        ("¿Qué es RAG?", 2, 3, document_id)
    ]


def test_search_rejects_empty_question(authenticated_user):
    response = client.post(
        "/api/v1/search",
        json={
            "question": "   ",
        },
    )

    assert response.status_code == 422


def test_search_requires_authentication():
    assert get_current_user not in app.dependency_overrides

    response = client.post(
        "/api/v1/search",
        json={
            "question": "¿Qué es Python?",
        },
    )

    assert response.status_code == 401


def test_search_handles_database_error(authenticated_user, monkeypatch):
    def fake_search(question, user_id, limit, document_id):
        raise SQLAlchemyError("Error de prueba")

    monkeypatch.setattr(
        semantic_search,
        "search_relevant_chunks_for_user",
        fake_search,
    )

    response = client.post(
        "/api/v1/search",
        json={
            "question": "¿Qué es Python?",
        },
    )

    assert response.status_code == 500

    assert response.json()["detail"] == (
        "Error interno al buscar documentos"
    )