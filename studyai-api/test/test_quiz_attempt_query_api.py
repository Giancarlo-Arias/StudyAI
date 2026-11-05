from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import quizzes


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(
        quizzes.router,
        prefix="/api/v1",
    )

    app.dependency_overrides[get_current_user] = lambda: {
        "id": 2,
    }

    with TestClient(app) as test_client:
        yield test_client


def make_attempt(quiz_id, attempt_id):
    return {
        "attempt_id": attempt_id,
        "quiz_id": quiz_id,
        "question_count": 3,
        "correct_count": 2,
        "score_percent": Decimal("66.67"),
        "submitted_at": datetime.now(timezone.utc),
    }


def test_list_quiz_attempts(client, monkeypatch):
    quiz_id = uuid4()
    attempt_id = uuid4()
    calls = []

    def fake_list(quiz_id, user_id):
        calls.append(user_id)
        return [make_attempt(quiz_id, attempt_id)]

    monkeypatch.setattr(
        quizzes,
        "list_quiz_attempts_for_user",
        fake_list,
    )

    response = client.get(
        f"/api/v1/quizzes/{quiz_id}/attempts"
    )

    assert response.status_code == 200

    attempts = response.json()["attempts"]

    assert len(attempts) == 1
    assert attempts[0]["attempt_id"] == str(attempt_id)
    assert attempts[0]["correct_count"] == 2
    assert attempts[0]["score_percent"] == 66.67
    assert calls == [2]


def test_list_empty_attempts(client, monkeypatch):
    monkeypatch.setattr(
        quizzes,
        "list_quiz_attempts_for_user",
        lambda quiz_id, user_id: [],
    )

    response = client.get(
        f"/api/v1/quizzes/{uuid4()}/attempts"
    )

    assert response.status_code == 200
    assert response.json() == {"attempts": []}


def test_reject_unauthorized_quiz_history(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        quizzes,
        "list_quiz_attempts_for_user",
        lambda quiz_id, user_id: None,
    )

    response = client.get(
        f"/api/v1/quizzes/{uuid4()}/attempts"
    )

    assert response.status_code == 404


def test_get_attempt_detail(client, monkeypatch):
    quiz_id = uuid4()
    attempt_id = uuid4()
    question_id = uuid4()
    calls = []

    def fake_get(quiz_id, attempt_id, user_id):
        calls.append((quiz_id, attempt_id, user_id))

        return {
            **make_attempt(quiz_id, attempt_id),
            "answers": [{
                "question_id": question_id,
                "position": 1,
                "question_text": "¿Qué es un embedding?",
                "options": [
                    "Un vector numérico",
                    "Un archivo PDF",
                    "Una contraseña",
                    "Una consulta SQL",
                ],
                "selected_option": 0,
                "correct_option": 0,
                "is_correct": True,
                "explanation": (
                    "Un embedding representa "
                    "información numéricamente."
                ),
            }],
        }

    monkeypatch.setattr(
        quizzes,
        "get_quiz_attempt_for_user",
        fake_get,
    )

    response = client.get(
        f"/api/v1/quizzes/{quiz_id}/attempts/{attempt_id}"
    )

    assert response.status_code == 200

    result = response.json()

    assert result["attempt_id"] == str(attempt_id)
    assert result["score_percent"] == 66.67
    assert len(result["answers"]) == 1
    assert result["answers"][0]["is_correct"] is True
    assert result["answers"][0]["correct_option"] == 0
    assert result["answers"][0]["position"] == 1

    assert calls == [(quiz_id, attempt_id, 2)]


def test_reject_nonexistent_attempt(client, monkeypatch):
    monkeypatch.setattr(
        quizzes,
        "get_quiz_attempt_for_user",
        lambda quiz_id, attempt_id, user_id: None,
    )

    response = client.get(
        f"/api/v1/quizzes/{uuid4()}/attempts/{uuid4()}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Intento no encontrado"


@pytest.mark.parametrize(
    "path",
    [
        f"/api/v1/quizzes/{uuid4()}/attempts",
        f"/api/v1/quizzes/{uuid4()}/attempts/{uuid4()}",
    ],
)
def test_attempt_history_requires_authentication(path):
    app = FastAPI()

    app.include_router(
        quizzes.router,
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.get(path)

    assert response.status_code in (401, 403)