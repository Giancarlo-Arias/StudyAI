from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import progress


@pytest.fixture
def client():
    app = FastAPI()

    app.include_router(
        progress.router,
        prefix="/api/v1",
    )

    app.dependency_overrides[get_current_user] = lambda: {
        "id": 2,
    }

    with TestClient(app) as test_client:
        yield test_client


def test_get_user_progress(client, monkeypatch):
    quiz_id = uuid4()
    attempt_id = uuid4()
    calls = []

    def fake_progress(user_id):
        calls.append(user_id)

        return {
            "total_quizzes": 3,
            "quizzes_completed": 2,
            "total_attempts": 4,
            "average_score_percent": 87.5,
            "best_score_percent": 100.0,
            "recent_attempts": [{
                "attempt_id": attempt_id,
                "quiz_id": quiz_id,
                "quiz_title": "Evaluación de tecnología",
                "question_count": 4,
                "correct_count": 4,
                "score_percent": 100,
                "submitted_at": datetime.now(timezone.utc),
            }],
        }

    monkeypatch.setattr(
        progress,
        "get_progress_for_user",
        fake_progress,
    )

    response = client.get("/api/v1/progress")

    assert response.status_code == 200

    result = response.json()

    assert result["total_quizzes"] == 3
    assert result["quizzes_completed"] == 2
    assert result["total_attempts"] == 4
    assert result["average_score_percent"] == 87.5
    assert result["best_score_percent"] == 100.0

    assert len(result["recent_attempts"]) == 1
    assert result["recent_attempts"][0]["attempt_id"] == (
        str(attempt_id)
    )

    assert calls == [2]


def test_get_progress_without_activity(client, monkeypatch):
    monkeypatch.setattr(
        progress,
        "get_progress_for_user",
        lambda user_id: {
            "total_quizzes": 0,
            "quizzes_completed": 0,
            "total_attempts": 0,
            "average_score_percent": 0,
            "best_score_percent": 0,
            "recent_attempts": [],
        },
    )

    response = client.get("/api/v1/progress")

    assert response.status_code == 200
    assert response.json()["total_attempts"] == 0
    assert response.json()["recent_attempts"] == []


def test_progress_requires_authentication():
    app = FastAPI()

    app.include_router(
        progress.router,
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.get("/api/v1/progress")

    assert response.status_code in (401, 403)