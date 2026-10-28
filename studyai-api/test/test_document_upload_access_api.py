from types import SimpleNamespace
from unittest.mock import Mock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.v1.dependencies import get_current_user
from app.api.v1.routers import documents
from app.main import app


client = TestClient(app)


@pytest.fixture
def authenticated_user():
    async def fake_current_user():
        return {
            "id": 2,
            "full_name": "Usuario Prueba",
            "email": "usuario@example.com",
        }

    app.dependency_overrides[get_current_user] = fake_current_user

    yield

    app.dependency_overrides.pop(get_current_user, None)


def test_upload_requires_authentication(monkeypatch):
    mock_process = Mock()
    mock_save = Mock()

    monkeypatch.setattr(documents, "process_pdf", mock_process)
    monkeypatch.setattr(documents, "save_document_for_user", mock_save)

    response = client.post(
        "/api/v1/documents/upload",
        files={
            "file": ("prueba.pdf", b"%PDF-1.4", "application/pdf")
        },
    )

    assert response.status_code == 401
    mock_process.assert_not_called()
    mock_save.assert_not_called()


def test_upload_uses_authenticated_user(monkeypatch, authenticated_user):
    document_id = uuid4()

    processed = SimpleNamespace(
        filename="prueba.pdf",
        size_bytes=100,
        pages_with_text=1,
        text_length=30,
        chunks=[
            SimpleNamespace(
                page_number=1,
                chunk_index=1,
                text="Contenido de prueba",
            )
        ],
    )

    mock_process = Mock(return_value=processed)
    mock_save = Mock(return_value=document_id)

    monkeypatch.setattr(documents, "process_pdf", mock_process)
    monkeypatch.setattr(documents, "save_document_for_user", mock_save)

    response = client.post(
        "/api/v1/documents/upload",
        files={
            "file": ("prueba.pdf", b"%PDF-1.4", "application/pdf")
        },
    )

    assert response.status_code == 200
    assert response.json()["document_id"] == str(document_id)
    assert response.json()["chunk_count"] == 1

    mock_save.assert_called_once_with(processed, 2)