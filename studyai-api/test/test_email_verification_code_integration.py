import hashlib
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from app.core.config import get_settings
from app.repositories import email_verification_repository as repository


# Crear una conexión exclusiva a la base de datos de pruebas.
@pytest.fixture(scope="module")
def test_engine():
    settings = get_settings()

    url = URL.create(
        drivername="postgresql+psycopg",
        username=settings.db_user,
        password=settings.db_password,
        host=settings.db_host,
        port=settings.db_port,
        database="studyai_test_db",
    )

    engine = create_engine(
        url,
        pool_pre_ping=True,
    )

    try:
        # Impedir que las pruebas se ejecuten sobre la base de desarrollo.
        with engine.connect() as connection:
            database_name = connection.execute(
                text("SELECT current_database();")
            ).scalar_one()

            assert database_name == "studyai_test_db"

        yield engine

    finally:
        engine.dispose()


# Crear un usuario temporal y un código para cada prueba.
@pytest.fixture
def verification_account(test_engine, monkeypatch):
    monkeypatch.setattr(
        repository,
        "get_engine",
        lambda: test_engine,
    )

    email = f"verification-{uuid4().hex}@example.com"

    correct_hash = hashlib.sha256(
        b"codigo-correcto"
    ).hexdigest()

    incorrect_hash = hashlib.sha256(
        b"codigo-incorrecto"
    ).hexdigest()

    with test_engine.begin() as connection:
        user_id = connection.execute(
            text("""
                INSERT INTO users (
                    full_name,
                    email,
                    password_hash
                )
                VALUES (
                    'Usuario Integracion',
                    :email,
                    'hash-test'
                )
                RETURNING id;
            """),
            {"email": email},
        ).scalar_one()

        connection.execute(
            text("""
                INSERT INTO email_verification_tokens (
                    user_id,
                    token_hash,
                    failed_attempts,
                    expires_at,
                    created_at
                )
                VALUES (
                    :user_id,
                    :token_hash,
                    0,
                    clock_timestamp() + INTERVAL '5 minutes',
                    clock_timestamp()
                );
            """),
            {
                "user_id": user_id,
                "token_hash": correct_hash,
            },
        )

    yield {
        "id": user_id,
        "email": email,
        "correct_hash": correct_hash,
        "incorrect_hash": incorrect_hash,
    }

    # Eliminar los datos temporales después de cada prueba.
    with test_engine.begin() as connection:
        connection.execute(
            text("""
                DELETE FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        )

        connection.execute(
            text("""
                DELETE FROM users
                WHERE id = :user_id;
            """),
            {"user_id": user_id},
        )


def test_correct_code_verifies_and_cannot_be_reused(
    test_engine,
    verification_account,
):
    """Verificar correctamente y consumir el código una sola vez."""

    account = verification_account

    assert repository.verify_email_verification_code(
        account["email"],
        account["correct_hash"],
    ) is True

    # El mismo código no debe funcionar por segunda vez.
    assert repository.verify_email_verification_code(
        account["email"],
        account["correct_hash"],
    ) is False

    with test_engine.connect() as connection:
        verified_at = connection.execute(
            text("""
                SELECT email_verified_at
                FROM users
                WHERE id = :user_id;
            """),
            {"user_id": account["id"]},
        ).scalar_one()

        remaining_codes = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": account["id"]},
        ).scalar_one()

    assert verified_at is not None
    assert remaining_codes == 0


def test_five_failed_attempts_block_correct_code(
    test_engine,
    verification_account,
):
    """Bloquear el código después de cinco intentos incorrectos."""

    account = verification_account

    for _ in range(5):
        assert repository.verify_email_verification_code(
            account["email"],
            account["incorrect_hash"],
        ) is False

    with test_engine.connect() as connection:
        failed_attempts = connection.execute(
            text("""
                SELECT failed_attempts
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": account["id"]},
        ).scalar_one()

    assert failed_attempts == 5

    # Incluso el código correcto debe quedar bloqueado.
    assert repository.verify_email_verification_code(
        account["email"],
        account["correct_hash"],
    ) is False


def test_expired_code_is_rejected(
    test_engine,
    verification_account,
):
    """Rechazar códigos cuyo tiempo de validez terminó."""

    account = verification_account

    # Simular el vencimiento sin esperar cinco minutos.
    with test_engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE email_verification_tokens
                SET expires_at = clock_timestamp() - INTERVAL '1 second'
                WHERE user_id = :user_id;
            """),
            {"user_id": account["id"]},
        )

    assert repository.verify_email_verification_code(
        account["email"],
        account["correct_hash"],
    ) is False


def test_resend_respects_sixty_seconds(
    test_engine,
    verification_account,
):
    """Impedir el reenvío antes de que pasen sesenta segundos."""

    account = verification_account

    new_hash = hashlib.sha256(
        b"codigo-nuevo"
    ).hexdigest()

    # No han pasado los 60 segundos.
    assert repository.replace_email_verification_token_for_unverified_user(
        account["email"],
        new_hash,
    ) is False

    # Simular que pasaron 61 segundos.
    with test_engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE email_verification_tokens
                SET created_at = clock_timestamp() - INTERVAL '61 seconds'
                WHERE user_id = :user_id;
            """),
            {"user_id": account["id"]},
        )

    assert repository.replace_email_verification_token_for_unverified_user(
        account["email"],
        new_hash,
    ) is True

    # El código anterior debe quedar invalidado.
    assert repository.verify_email_verification_code(
        account["email"],
        account["correct_hash"],
    ) is False

    # El nuevo código debe funcionar.
    assert repository.verify_email_verification_code(
        account["email"],
        new_hash,
    ) is True


def test_resend_resets_failed_attempts(
    test_engine,
    verification_account,
):
    """Restablecer los intentos cuando se genera un código nuevo."""

    account = verification_account

    # Registrar dos intentos incorrectos.
    for _ in range(2):
        assert repository.verify_email_verification_code(
            account["email"],
            account["incorrect_hash"],
        ) is False

    new_hash = hashlib.sha256(
        b"nuevo-codigo-seguro"
    ).hexdigest()

    with test_engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE email_verification_tokens
                SET created_at = clock_timestamp() - INTERVAL '61 seconds'
                WHERE user_id = :user_id;
            """),
            {"user_id": account["id"]},
        )

    assert repository.replace_email_verification_token_for_unverified_user(
        account["email"],
        new_hash,
    ) is True

    with test_engine.connect() as connection:
        failed_attempts = connection.execute(
            text("""
                SELECT failed_attempts
                FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": account["id"]},
        ).scalar_one()

    assert failed_attempts == 0