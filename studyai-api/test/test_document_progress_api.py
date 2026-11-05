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


def test_get_document_progress(client, monkeypatch):
    document_id = uuid4()
    calls = []

    def fake_progress(user_id):
        calls.append(user_id)

        return [{
            "document_id": document_id,
            "filename": "tecnologia.pdf",
            "total_quizzes": 2,
            "quizzes_completed": 1,
            "total_attempts": 1,
            "average_score_percent": 66.67,
            "best_score_percent": 66.67,
            "last_attempt_at": datetime.now(timezone.utc),
        }]

    monkeypatch.setattr(
        progress,
        "list_document_progress_for_user",
        fake_progress,
    )

    response = client.get("/api/v1/progress/documents")

    assert response.status_code == 200

    documents = response.json()["documents"]

    assert len(documents) == 1
    assert documents[0]["document_id"] == str(document_id)
    assert documents[0]["total_quizzes"] == 2
    assert documents[0]["quizzes_completed"] == 1
    assert documents[0]["average_score_percent"] == 66.67

    assert calls == [2]


def test_document_progress_without_documents(
    client,
    monkeypatch,
):
    monkeypatch.setattr(
        progress,
        "list_document_progress_for_user",
        lambda user_id: [],
    )

    response = client.get("/api/v1/progress/documents")

    assert response.status_code == 200
    assert response.json() == {"documents": []}


def test_document_progress_requires_authentication():
    app = FastAPI()

    app.include_router(
        progress.router,
        prefix="/api/v1",
    )

    with TestClient(app) as client:
        response = client.get("/api/v1/progress/documents")

    assert response.status_code in (401, 403)