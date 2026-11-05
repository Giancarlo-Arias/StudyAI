from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import dashboard


@pytest.fixture
def client():
    app = FastAPI()

    app.include_router(
        dashboard.router,
        prefix="/api/v1",
    )

    app.dependency_overrides[get_current_user] = lambda: {
        "id": 2,
    }

    with TestClient(app) as test_client:
        yield test_client


def make_dashboard_data():
    now = datetime.now(timezone.utc)

    return {
        "progress": {
            "total_quizzes": 2,
            "quizzes_completed": 1,
            "total_attempts": 1,
            "average_score_percent": 66.67,
            "best_score_percent": 66.67,
            "recent_attempts": [{
                "attempt_id": uuid4(),
                "quiz_id": uuid4(),
                "quiz_title": "Evaluación de tecnología",
                "question_count": 3,
                "correct_count": 2,
                "score_percent": 66.67,
                "submitted_at": now,
            }],
        },
        "documents": [{
            "document_id": uuid4(),
            "filename": "tecnologia.pdf",
            "total_quizzes": 2,
            "quizzes_completed": 1,
            "total_attempts": 1,
            "average_score_percent": 66.67,
            "best_score_percent": 66.67,
            "last_attempt_at": now,
        }],
        "achievements": [{
            "code": "first_quiz",
            "title": "Primer paso",
            "description": "Completa tu primer cuestionario.",
            "current": 1,
            "target": 1,
            "unlocked": True,
            "unlocked_at": now,
        }],
    }


def test_get_dashboard_success(client, monkeypatch):
    calls = []
    dashboard_data = make_dashboard_data()

    def fake_dashboard(user_id):
        calls.append(user_id)
        return dashboard_data

    monkeypatch.setattr(
        dashboard,
        "get_dashboard_for_user",
        fake_dashboard,
    )

    response = client.get("/api/v1/dashboard")

    assert response.status_code == 200

    result = response.json()

    assert result["progress"]["total_quizzes"] == 2
    assert result["progress"]["total_attempts"] == 1

    assert len(result["documents"]) == 1
    assert result["documents"][0]["filename"] == (
        "tecnologia.pdf"
    )

    assert len(result["achievements"]) == 1
    assert result["achievements"][0]["unlocked"] is True

    assert calls == [2]


def test_get_dashboard_without_activity(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        dashboard,
        "get_dashboard_for_user",
        lambda user_id: {
            "progress": {
                "total_quizzes": 0,
                "quizzes_completed": 0,
                "total_attempts": 0,
                "average_score_percent": 0,
                "best_score_percent": 0,
                "recent_attempts": [],
            },
            "documents": [],
            "achievements": [],
        },
    )

    response = client.get("/api/v1/dashboard")

    assert response.status_code == 200

    result = response.json()

    assert result["progress"]["total_quizzes"] == 0
    assert result["documents"] == []
    assert result["achievements"] == []


def test_dashboard_requires_authentication():
    app = FastAPI()

    app.include_router(
        dashboard.router,
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.get("/api/v1/dashboard")

    assert response.status_code in (401, 403)