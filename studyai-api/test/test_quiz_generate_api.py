from uuid import UUID, uuid4

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


def make_payload():
    return {
        "document_id": str(uuid4()),
        "title": " Evaluación de tecnología ",
        "question_count": 3,
        "difficulty": "dificil",
    }


def test_generate_quiz_success(client, monkeypatch):
    quiz_id = uuid4()
    calls = []

    def fake_generate(**kwargs):
        calls.append(kwargs)
        return quiz_id

    monkeypatch.setattr(
        quizzes,
        "generate_and_save_quiz_for_document",
        fake_generate,
    )

    payload = make_payload()

    response = client.post(
        "/api/v1/quizzes/generate",
        json=payload,
    )

    assert response.status_code == 201
    assert response.json() == {
        "quiz_id": str(quiz_id),
    }

    assert calls == [{
        "document_id": UUID(payload["document_id"]),
        "user_id": 2,
        "title": "Evaluación de tecnología",
        "question_count": 3,
        "difficulty": "dificil",
    }]


@pytest.mark.parametrize(
    "field,value",
    [
        ("difficulty", "extrema"),
        ("question_count", 0),
        ("question_count", 21),
        ("title", "   "),
    ],
)
def test_reject_invalid_quiz_configuration(
    client,
    monkeypatch,
    field,
    value,
):
    def fake_generate(**kwargs):
        pytest.fail(
            "No debe generarse un quiz con datos inválidos"
        )

    monkeypatch.setattr(
        quizzes,
        "generate_and_save_quiz_for_document",
        fake_generate,
    )

    payload = make_payload()
    payload[field] = value

    response = client.post(
        "/api/v1/quizzes/generate",
        json=payload,
    )

    assert response.status_code == 422


def test_generate_quiz_requires_authentication(monkeypatch):
    app = FastAPI()
    app.include_router(
        quizzes.router,
        prefix="/api/v1",
    )

    def fake_generate(**kwargs):
        pytest.fail(
            "No debe generarse un quiz sin autenticación"
        )

    monkeypatch.setattr(
        quizzes,
        "generate_and_save_quiz_for_document",
        fake_generate,
    )

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/quizzes/generate",
            json=make_payload(),
        )

    assert response.status_code in (401, 403)