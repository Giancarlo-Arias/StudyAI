from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.security import hash_password, verify_password
from app.db.connection import get_engine
from app.repositories import user_repository
from app.repositories.user_repository import UserAlreadyExistsError
from app.schemas.user import UserRegister
from app.services.user_service import register_user


# Crear una conexión exclusiva con la base de pruebas
@pytest.fixture
def db_engine(monkeypatch):
    original_url = get_engine().url

    # Evitar ejecutar pruebas sobre un servidor remoto
    if original_url.host not in ("127.0.0.1", "localhost"):
        pytest.fail("Las pruebas requieren PostgreSQL local")

    # Cambiar únicamente el nombre de la base
    test_url = original_url.set(database="studyai_test_db")

    engine = create_engine(test_url, pool_pre_ping=True)

    try:
        # Confirmar la base conectada antes de modificar datos
        with engine.connect() as connection:
            database_name = connection.execute(
                text("SELECT current_database()")
            ).scalar_one()

        assert database_name == "studyai_test_db"

        # Sustituir temporalmente la conexión del repositorio
        monkeypatch.setattr(
            user_repository,
            "get_engine",
            lambda: engine
        )

        yield engine

    finally:
        engine.dispose()


# Eliminar el usuario creado durante la prueba
def delete_test_user(engine: Engine, email: str) -> None:
    with engine.begin() as connection:
        connection.execute(
            text("""
                DELETE FROM users
                WHERE email = :email
            """),
            {"email": email}
        )


# Prueba 1: Registrar usuario y verificar Argon2id
def test_register_user(db_engine):
    email = f"pytest_{uuid4().hex}@example.com"
    password = "StudyAI-Segura-2026!"

    try:
        # Registrar el usuario usando nuestro servicio
        user = register_user(
            UserRegister(
                full_name="Giancarlo Arias",
                email=email,
                password=password
            )
        )

        # Verificar los datos devueltos
        assert isinstance(user["id"], int)
        assert user["full_name"] == "Giancarlo Arias"
        assert user["email"] == email
        assert user["is_active"] is True
        assert user["email_verified_at"] is None

        # El repositorio no debe exponer contraseñas
        assert "password" not in user
        assert "password_hash" not in user

        # Consultar el hash almacenado en PostgreSQL
        with db_engine.connect() as connection:
            stored_hash = connection.execute(
                text("""
                    SELECT password_hash
                    FROM users
                    WHERE id = :user_id
                """),
                {"user_id": user["id"]}
            ).scalar_one()

        # Confirmar que nunca se guardó texto plano
        assert stored_hash != password

        # Confirmar que se utiliza Argon2id
        assert stored_hash.startswith("$argon2id$")

        # Validar contraseña correcta e incorrecta
        assert verify_password(password, stored_hash) is True
        assert verify_password("Incorrecta-2026!", stored_hash) is False

    finally:
        # Limpiar los datos incluso si falla una comprobación
        delete_test_user(db_engine, email)


# Prueba 2: Rechazar un correo duplicado
def test_duplicate_email(db_engine):
    email = f"pytest_{uuid4().hex}@example.com"

    try:
        # Registrar el primer usuario
        register_user(
            UserRegister(
                full_name="Carlos Rodríguez",
                email=email,
                password="Primera-Contrasena-2026!"
            )
        )

        # Intentar registrar otro usuario con el mismo correo
        # usando mayúsculas para probar el índice único
        with pytest.raises(
            UserAlreadyExistsError,
            match="Ya existe una cuenta con ese correo"
        ):
            user_repository.create_user(
                full_name="Otro Usuario",
                email=email.upper(),
                password_hash=hash_password(
                    "Segunda-Contrasena-2026!"
                )
            )

        # Comprobar que solo quedó registrado un usuario
        with db_engine.connect() as connection:
            count = connection.execute(
                text("""
                    SELECT COUNT(*)
                    FROM users
                    WHERE LOWER(email) = :email
                """),
                {"email": email}
            ).scalar_one()

        assert count == 1

    finally:
        # Limpiar el usuario de prueba
        delete_test_user(db_engine, email)