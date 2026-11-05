
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import documents as documents_router
from app.main import app


client = TestClient(app)


@pytest.fixture
def upload_environment(monkeypatch):
    user_id = 10
    document_id = uuid4()

    app.dependency_overrides[get_current_user] = lambda: {
        "id": user_id,
        "email": "test@example.com",
    }

    document = SimpleNamespace(
        filename="ejemplo.pdf",
        size_bytes=100,
        pages_with_text=1,
        text_length=60,
        chunks=[
            {"text": "Primer fragmento."},
            {"text": "Segundo fragmento."},
        ],
    )

    monkeypatch.setattr(
        documents_router,
        "process_pdf",
        lambda filename, content: document,
    )

    monkeypatch.setattr(
        documents_router,
        "save_document_for_user",
        lambda result, current_user_id: document_id,
    )

    try:
        yield {
            "document_id": document_id,
            "user_id": user_id,
        }
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_upload_generates_embeddings(upload_environment, monkeypatch):
    data = upload_environment
    calls = []

    def fake_generate_embeddings(document_id, user_id):
        calls.append((document_id, user_id))
        return 2

    monkeypatch.setattr(
        documents_router,
        "generate_and_save_document_embeddings",
        fake_generate_embeddings,
    )

    response = client.post(
        "/api/v1/documents/upload",
        files={
            "file": (
                "ejemplo.pdf",
                b"%PDF-1.4",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["embedding_status"] == "ready"
    assert response.json()["chunk_count"] == 2

    assert calls == [
        (data["document_id"], data["user_id"])
    ]


def test_upload_preserves_document_if_embeddings_fail(
    upload_environment,
    monkeypatch,
):
    def fake_generate_embeddings(document_id, user_id):
        raise RuntimeError("Error simulado del modelo")

    monkeypatch.setattr(
        documents_router,
        "generate_and_save_document_embeddings",
        fake_generate_embeddings,
    )

    response = client.post(
        "/api/v1/documents/upload",
        files={
            "file": (
                "ejemplo.pdf",
                b"%PDF-1.4",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 200
    assert response.json()["embedding_status"] == "pending"

    assert response.json()["document_id"] == str(
        upload_environment["document_id"]
    )
