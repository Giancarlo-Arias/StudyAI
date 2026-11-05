from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import achievements


@pytest.fixture
def client():
    app = FastAPI()

    app.include_router(
        achievements.router,
        prefix="/api/v1",
    )

    app.dependency_overrides[get_current_user] = lambda: {
        "id": 2,
    }

    with TestClient(app) as test_client:
        yield test_client


def test_get_achievements(client, monkeypatch):
    calls = []

    def fake_achievements(user_id):
        calls.append(user_id)

        return [
            {
                "code": "first_quiz",
                "title": "Primer paso",
                "description": "Completa tu primer cuestionario.",
                "current": 1,
                "target": 1,
                "unlocked": True,
                "unlocked_at": datetime.now(timezone.utc),
            },
            {
                "code": "perfect_score",
                "title": "Puntuación perfecta",
                "description": "Obtén una calificación de 100%.",
                "current": 0,
                "target": 1,
                "unlocked": False,
                "unlocked_at": None,
            },
        ]

    monkeypatch.setattr(
        achievements,
        "get_achievements_for_user",
        fake_achievements,
    )

    response = client.get("/api/v1/achievements")

    assert response.status_code == 200

    result = response.json()["achievements"]

    assert len(result) == 2
    assert result[0]["code"] == "first_quiz"
    assert result[0]["unlocked"] is True
    assert result[0]["unlocked_at"] is not None

    assert result[1]["unlocked"] is False
    assert result[1]["unlocked_at"] is None

    assert calls == [2]


def test_get_achievements_without_activity(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        achievements,
        "get_achievements_for_user",
        lambda user_id: [{
            "code": "first_quiz",
            "title": "Primer paso",
            "description": "Completa tu primer cuestionario.",
            "current": 0,
            "target": 1,
            "unlocked": False,
            "unlocked_at": None,
        }],
    )

    response = client.get("/api/v1/achievements")

    assert response.status_code == 200
    assert response.json()["achievements"][0]["current"] == 0


def test_achievements_require_authentication():
    app = FastAPI()

    app.include_router(
        achievements.router,
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.get("/api/v1/achievements")

    assert response.status_code in (401, 403)