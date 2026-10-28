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
    async def fake_user():
        return {
            "id": 2,
            "full_name": "Usuario Prueba",
            "email": "usuario@example.com",
        }

    app.dependency_overrides[get_current_user] = fake_user

    yield

    app.dependency_overrides.pop(get_current_user, None)


def test_list_requires_authentication():
    response = client.get("/api/v1/documents")

    assert response.status_code == 401


def test_list_uses_authenticated_user(monkeypatch, authenticated_user):
    mock_list = Mock(return_value=[])

    monkeypatch.setattr(
        documents,
        "list_documents_for_user",
        mock_list,
    )

    response = client.get(
        "/api/v1/documents",
        params={"limit": 10, "offset": 0},
    )

    assert response.status_code == 200
    assert response.json()["documents"] == []

    mock_list.assert_called_once_with(2, 10, 0)


def test_delete_requires_authentication():
    response = client.delete(
        f"/api/v1/documents/{uuid4()}"
    )

    assert response.status_code == 401


def test_owner_can_delete(monkeypatch, authenticated_user):
    document_id = uuid4()

    mock_delete = Mock(return_value=True)

    monkeypatch.setattr(
        documents,
        "delete_document_for_user",
        mock_delete,
    )

    response = client.delete(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 204
    assert response.content == b""

    mock_delete.assert_called_once_with(document_id, 2)


def test_cannot_delete_other_user_document(
    monkeypatch,
    authenticated_user,
):
    document_id = uuid4()

    mock_delete = Mock(return_value=False)

    monkeypatch.setattr(
        documents,
        "delete_document_for_user",
        mock_delete,
    )

    response = client.delete(
        f"/api/v1/documents/{document_id}"
    )

    assert response.status_code == 404
    mock_delete.assert_called_once_with(document_id, 2)