from pathlib import Path
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.api.v1.dependencies import get_current_user
from app.core.jwt_tokens import create_access_token
from app.core.security import hash_password
from app.db.connection import get_engine
from app.main import app
from app.repositories import (
    auth_repository,
    document_access_repository,
    document_repository,
)


client = TestClient(app)

PDF_PATH = Path(__file__).parent / "fixtures" / "ejemplo.pdf"


# Preparar usuarios reales en PostgreSQL de pruebas
@pytest.fixture
def integration_environment(monkeypatch):

    test_url = get_engine().url.set(database="studyai_test_db")
    test_engine = create_engine(test_url, pool_pre_ping=True)

    # Evitar utilizar accidentalmente la base principal
    with test_engine.connect() as connection:
        database_name = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database_name == "studyai_test_db"

    # Utilizar PostgreSQL de pruebas en los repositorios
    monkeypatch.setattr(
        auth_repository,
        "get_engine",
        lambda: test_engine,
    )

    monkeypatch.setattr(
        document_repository,
        "get_engine",
        lambda: test_engine,
    )

    monkeypatch.setattr(
        document_access_repository,
        "get_engine",
        lambda: test_engine,
    )

    # Utilizar autenticación real, sin simular get_current_user
    assert get_current_user not in app.dependency_overrides

    password_hash = hash_password("ClaveDePruebaSegura2026!")

    with test_engine.begin() as connection:

        user_a_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Usuario A',
                    :email,
                    :password_hash,
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {
                "email": f"user_a_{uuid4().hex}@example.com",
                "password_hash": password_hash,
            },
        ).scalar_one()

        user_b_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                )
                VALUES (
                    'Usuario B',
                    :email,
                    :password_hash,
                    TRUE,
                    NOW()
                )
                RETURNING id;
            """),
            {
                "email": f"user_b_{uuid4().hex}@example.com",
                "password_hash": password_hash,
            },
        ).scalar_one()

    try:
        yield {
            "engine": test_engine,
            "user_a_id": user_a_id,
            "user_b_id": user_b_id,
        }

    finally:
        # Limpiar solamente los registros de estos usuarios
        with test_engine.begin() as connection:

            connection.execute(
                text("""
                    DELETE FROM documents
                    WHERE user_id IN (:user_a_id, :user_b_id);
                """),
                {
                    "user_a_id": user_a_id,
                    "user_b_id": user_b_id,
                },
            )

            connection.execute(
                text("""
                    DELETE FROM users
                    WHERE id IN (:user_a_id, :user_b_id);
                """),
                {
                    "user_a_id": user_a_id,
                    "user_b_id": user_b_id,
                },
            )

        test_engine.dispose()


# Crear un JWT real para las solicitudes HTTP
def auth_headers(user_id: int) -> dict[str, str]:
    token = create_access_token(user_id)

    return {
        "Authorization": f"Bearer {token}",
    }


# Prueba 1: Flujo completo con dos usuarios y eliminación selectiva
def test_document_security_between_users(integration_environment):

    engine = integration_environment["engine"]
    user_a_id = integration_environment["user_a_id"]
    user_b_id = integration_environment["user_b_id"]

    headers_a = auth_headers(user_a_id)
    headers_b = auth_headers(user_b_id)

    # Verificar ambos JWT mediante /auth/me
    response_a = client.get("/api/v1/auth/me", headers=headers_a)
    response_b = client.get("/api/v1/auth/me", headers=headers_b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200

    assert response_a.json()["id"] == user_a_id
    assert response_b.json()["id"] == user_b_id

    # Usuario A sube dos documentos
    pdf_content = PDF_PATH.read_bytes()

    uploaded_ids = []

    for filename in ("primero.pdf", "segundo.pdf"):

        response = client.post(
            "/api/v1/documents/upload",
            headers=headers_a,
            files={
                "file": (
                    filename,
                    pdf_content,
                    "application/pdf",
                )
            },
        )

        assert response.status_code == 200

        document_id = UUID(response.json()["document_id"])
        uploaded_ids.append(document_id)

    first_id, second_id = uploaded_ids

    # Comprobar que ambos documentos pertenecen al usuario A
    with engine.connect() as connection:

        owners = connection.execute(
            text("""
                SELECT id, user_id
                FROM documents
                WHERE id IN (:first_id, :second_id);
            """),
            {
                "first_id": first_id,
                "second_id": second_id,
            },
        ).mappings().all()

        assert len(owners) == 2
        assert all(row["user_id"] == user_a_id for row in owners)

        initial_chunk_count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks
                WHERE document_id = :document_id;
            """),
            {"document_id": first_id},
        ).scalar_one()

        assert initial_chunk_count >= 1

    # Usuario A puede listar sus dos documentos
    response = client.get(
        "/api/v1/documents",
        headers=headers_a,
    )

    assert response.status_code == 200

    ids_a = {
        document["id"]
        for document in response.json()["documents"]
    }

    assert str(first_id) in ids_a
    assert str(second_id) in ids_a

    # Usuario B no puede ver los documentos de A
    response = client.get(
        "/api/v1/documents",
        headers=headers_b,
    )

    assert response.status_code == 200
    assert response.json()["documents"] == []

    # Usuario A puede consultar los chunks de su documento
    response = client.get(
        f"/api/v1/documents/{first_id}",
        headers=headers_a,
    )

    assert response.status_code == 200
    assert response.json()["chunk_count"] == initial_chunk_count
    assert len(response.json()["chunks"]) >= 1

    # Usuario B no puede consultar el documento de A
    response = client.get(
        f"/api/v1/documents/{first_id}",
        headers=headers_b,
    )

    assert response.status_code == 404

    # Usuario B tampoco puede eliminarlo
    response = client.delete(
        f"/api/v1/documents/{first_id}",
        headers=headers_b,
    )

    assert response.status_code == 404

    # El documento sigue existiendo para A
    response = client.get(
        f"/api/v1/documents/{first_id}",
        headers=headers_a,
    )

    assert response.status_code == 200

    # Usuario A elimina solamente el primer PDF
    response = client.delete(
        f"/api/v1/documents/{first_id}",
        headers=headers_a,
    )

    assert response.status_code == 204

    # Comprobar que se eliminaron el PDF y sus chunks
    with engine.connect() as connection:

        remaining_document = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM documents
                WHERE id = :document_id;
            """),
            {"document_id": first_id},
        ).scalar_one()

        remaining_chunks = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM document_chunks
                WHERE document_id = :document_id;
            """),
            {"document_id": first_id},
        ).scalar_one()

        second_document_owner = connection.execute(
            text("""
                SELECT user_id
                FROM documents
                WHERE id = :document_id;
            """),
            {"document_id": second_id},
        ).scalar_one()

    assert remaining_document == 0
    assert remaining_chunks == 0

    # El segundo PDF permanece intacto
    assert second_document_owner == user_a_id

    response = client.get(
        f"/api/v1/documents/{second_id}",
        headers=headers_a,
    )

    assert response.status_code == 200


# Prueba 2: Un UUID inexistente no permite acceso ni eliminación
def test_missing_document_is_private(integration_environment):

    user_a_id = integration_environment["user_a_id"]
    user_b_id = integration_environment["user_b_id"]
    document_id = uuid4()

    for headers in (
        auth_headers(user_a_id),
        auth_headers(user_b_id),
    ):

        response = client.get(
            f"/api/v1/documents/{document_id}",
            headers=headers,
        )

        assert response.status_code == 404

        response = client.delete(
            f"/api/v1/documents/{document_id}",
            headers=headers,
        )

        assert response.status_code == 404