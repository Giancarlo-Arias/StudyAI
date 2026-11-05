from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import quizzes


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(quizzes.router, prefix="/api/v1")

    app.dependency_overrides[get_current_user] = lambda: {
        "id": 2,
    }

    with TestClient(app) as test_client:
        yield test_client


def test_list_my_quizzes(client, monkeypatch):
    quiz_id = uuid4()

    def fake_list(user_id):
        assert user_id == 2
        return [{
            "id": quiz_id,
            "document_id": uuid4(),
            "title": "Evaluación de tecnología",
            "created_at": datetime.now(timezone.utc),
            "question_count": 3,
        }]

    monkeypatch.setattr(
        quizzes,
        "list_quizzes_for_user",
        fake_list,
    )

    response = client.get("/api/v1/quizzes")

    assert response.status_code == 200
    assert len(response.json()["quizzes"]) == 1
    assert response.json()["quizzes"][0]["id"] == str(quiz_id)


def test_get_quiz_hides_correct_answers(client, monkeypatch):
    quiz_id = uuid4()

    def fake_get(quiz_id, user_id):
        assert user_id == 2

        return {
            "id": quiz_id,
            "document_id": uuid4(),
            "title": "Evaluación de tecnología",
            "created_at": datetime.now(timezone.utc),
            "questions": [{
                "id": uuid4(),
                "position": 1,
                "question_text": "¿Qué es un embedding?",
                "options": ["A", "B", "C", "D"],
                "correct_option": 2,
                "explanation": "Explicación privada",
            }],
        }

    monkeypatch.setattr(
        quizzes,
        "get_quiz_for_user",
        fake_get,
    )

    response = client.get(f"/api/v1/quizzes/{quiz_id}")

    assert response.status_code == 200

    question = response.json()["questions"][0]

    assert len(question["options"]) == 4
    assert "correct_option" not in question
    assert "explanation" not in question


def test_get_nonexistent_quiz(client, monkeypatch):
    monkeypatch.setattr(
        quizzes,
        "get_quiz_for_user",
        lambda quiz_id, user_id: None,
    )

    response = client.get(
        f"/api/v1/quizzes/{uuid4()}"
    )

    assert response.status_code == 404


def test_quiz_requires_authentication():
    app = FastAPI()
    app.include_router(quizzes.router, prefix="/api/v1")

    with TestClient(app) as client:
        response = client.get("/api/v1/quizzes")

    assert response.status_code in (401, 403)