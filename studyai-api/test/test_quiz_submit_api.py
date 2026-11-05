from datetime import datetime, timezone
from decimal import Decimal
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
        "answers": [
            {
                "question_id": str(uuid4()),
                "selected_option": 0,
            },
            {
                "question_id": str(uuid4()),
                "selected_option": 2,
            },
        ]
    }


def test_submit_quiz_success(client, monkeypatch):
    quiz_id = uuid4()
    attempt_id = uuid4()
    payload = make_payload()
    calls = []

    def fake_submit(**kwargs):
        calls.append(kwargs)

        return {
            "attempt_id": attempt_id,
            "quiz_id": quiz_id,
            "question_count": 2,
            "correct_count": 1,
            "score_percent": Decimal("50.00"),
            "submitted_at": datetime.now(timezone.utc),
            "answers": [
                {
                    "question_id": UUID(
                        payload["answers"][0]["question_id"]
                    ),
                    "selected_option": 0,
                    "correct_option": 0,
                    "is_correct": True,
                    "explanation": "Respuesta correcta.",
                },
                {
                    "question_id": UUID(
                        payload["answers"][1]["question_id"]
                    ),
                    "selected_option": 2,
                    "correct_option": 1,
                    "is_correct": False,
                    "explanation": "La opción correcta era B.",
                },
            ],
        }

    monkeypatch.setattr(
        quizzes,
        "submit_quiz_attempt_for_user",
        fake_submit,
    )

    response = client.post(
        f"/api/v1/quizzes/{quiz_id}/submit",
        json=payload,
    )

    assert response.status_code == 201

    result = response.json()

    assert result["attempt_id"] == str(attempt_id)
    assert result["quiz_id"] == str(quiz_id)
    assert result["question_count"] == 2
    assert result["correct_count"] == 1
    assert result["score_percent"] == 50.0

    assert result["answers"][0]["is_correct"] is True
    assert result["answers"][1]["is_correct"] is False
    assert result["answers"][1]["correct_option"] == 1

    assert calls == [{
        "quiz_id": quiz_id,
        "user_id": 2,
        "answers": [
            {
                "question_id": UUID(answer["question_id"]),
                "selected_option": answer["selected_option"],
            }
            for answer in payload["answers"]
        ],
    }]


@pytest.mark.parametrize(
    "invalid_option",
    [-1, 4, True, "1"],
)
def test_reject_invalid_option(
    client,
    monkeypatch,
    invalid_option,
):
    def fake_submit(**kwargs):
        pytest.fail("No debe guardar respuestas inválidas")

    monkeypatch.setattr(
        quizzes,
        "submit_quiz_attempt_for_user",
        fake_submit,
    )

    payload = make_payload()
    payload["answers"][0]["selected_option"] = invalid_option

    response = client.post(
        f"/api/v1/quizzes/{uuid4()}/submit",
        json=payload,
    )

    assert response.status_code == 422


def test_reject_empty_answers(client):
    response = client.post(
        f"/api/v1/quizzes/{uuid4()}/submit",
        json={"answers": []},
    )

    assert response.status_code == 422


def test_reject_extra_fields(client):
    payload = make_payload()

    payload["answers"][0]["correct_option"] = 0

    response = client.post(
        f"/api/v1/quizzes/{uuid4()}/submit",
        json=payload,
    )

    assert response.status_code == 422


def test_reject_nonexistent_or_unauthorized_quiz(
    client,
    monkeypatch,
):
    def fake_submit(**kwargs):
        raise ValueError(
            "Cuestionario no encontrado o no autorizado"
        )

    monkeypatch.setattr(
        quizzes,
        "submit_quiz_attempt_for_user",
        fake_submit,
    )

    response = client.post(
        f"/api/v1/quizzes/{uuid4()}/submit",
        json=make_payload(),
    )

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "Cuestionario no encontrado"
    )


def test_reject_incomplete_answers(client, monkeypatch):
    def fake_submit(**kwargs):
        raise ValueError(
            "Debes responder todas las preguntas del cuestionario"
        )

    monkeypatch.setattr(
        quizzes,
        "submit_quiz_attempt_for_user",
        fake_submit,
    )

    response = client.post(
        f"/api/v1/quizzes/{uuid4()}/submit",
        json=make_payload(),
    )

    assert response.status_code == 422
    assert "todas las preguntas" in response.json()["detail"]


def test_submit_requires_authentication(monkeypatch):
    app = FastAPI()

    app.include_router(
        quizzes.router,
        prefix="/api/v1",
    )

    def fake_submit(**kwargs):
        pytest.fail("No debe guardar intentos sin autenticación")

    monkeypatch.setattr(
        quizzes,
        "submit_quiz_attempt_for_user",
        fake_submit,
    )

    with TestClient(app) as client:
        response = client.post(
            f"/api/v1/quizzes/{uuid4()}/submit",
            json=make_payload(),
        )

    assert response.status_code in (401, 403)