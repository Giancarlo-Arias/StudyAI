from uuid import uuid4

import pytest
from sqlalchemy import create_engine, text

from app.db.connection import get_engine
from app.repositories import auth_rate_limit_repository


@pytest.fixture
def rate_limit_environment(monkeypatch):
    """Utilizar exclusivamente la base de datos de pruebas."""

    test_url = get_engine().url.set(database="studyai_test_db")
    test_engine = create_engine(test_url, pool_pre_ping=True)

    with test_engine.connect() as connection:
        database = connection.execute(
            text("SELECT current_database()")
        ).scalar_one()

        assert database == "studyai_test_db"

    monkeypatch.setattr(
        auth_rate_limit_repository,
        "get_engine",
        lambda: test_engine,
    )

    client_ip = "192.0.2.10"
    action = f"test_{uuid4().hex[:16]}"

    try:
        yield test_engine, client_ip, action

    finally:
        with test_engine.begin() as connection:
            connection.execute(
                text("""
                    DELETE FROM auth_rate_limits
                    WHERE action IN (:action, :other_action);
                """),
                {
                    "action": action,
                    "other_action": f"{action}_other",
                },
            )

        test_engine.dispose()


def test_rate_limit_allows_10_requests(rate_limit_environment):
    engine, client_ip, action = rate_limit_environment

    # Permitir las primeras 10 solicitudes.
    for _ in range(10):
        assert auth_rate_limit_repository.allow_auth_request(
            client_ip,
            action,
        ) is True

    # Rechazar la solicitud número 11.
    assert auth_rate_limit_repository.allow_auth_request(
        client_ip,
        action,
    ) is False

    with engine.connect() as connection:
        count = connection.execute(
            text("""
                SELECT request_count
                FROM auth_rate_limits
                WHERE ip_address = CAST(:ip_address AS INET)
                  AND action = :action;
            """),
            {
                "ip_address": client_ip,
                "action": action,
            },
        ).scalar_one()

    assert count == 10


def test_rate_limit_resets_after_15_minutes(rate_limit_environment):
    engine, client_ip, action = rate_limit_environment

    assert auth_rate_limit_repository.allow_auth_request(
        client_ip,
        action,
    ) is True

    # Simular que transcurrieron 16 minutos.
    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE auth_rate_limits
                SET window_started_at =
                    CURRENT_TIMESTAMP - INTERVAL '16 minutes'
                WHERE ip_address = CAST(:ip_address AS INET)
                  AND action = :action;
            """),
            {
                "ip_address": client_ip,
                "action": action,
            },
        )

    assert auth_rate_limit_repository.allow_auth_request(
        client_ip,
        action,
    ) is True

    with engine.connect() as connection:
        count = connection.execute(
            text("""
                SELECT request_count
                FROM auth_rate_limits
                WHERE ip_address = CAST(:ip_address AS INET)
                  AND action = :action;
            """),
            {
                "ip_address": client_ip,
                "action": action,
            },
        ).scalar_one()

    assert count == 1


def test_rate_limit_separates_actions(rate_limit_environment):
    _, client_ip, action = rate_limit_environment

    assert auth_rate_limit_repository.allow_auth_request(
        client_ip,
        action,
    ) is True

    assert auth_rate_limit_repository.allow_auth_request(
        client_ip,
        f"{action}_other",
    ) is True


def test_rate_limit_rejects_invalid_ip(rate_limit_environment):
    _, _, action = rate_limit_environment

    with pytest.raises(ValueError):
        auth_rate_limit_repository.allow_auth_request(
            "invalid-ip",
            action,
        )



def test_cleanup_deletes_expired_limits(rate_limit_environment):
    engine, client_ip, action = rate_limit_environment

    active_ip = "192.0.2.11"

    assert auth_rate_limit_repository.allow_auth_request(
        client_ip, action
    ) is True

    assert auth_rate_limit_repository.allow_auth_request(
        active_ip, action
    ) is True

    # Simular una ventana vencida para la primera IP.
    with engine.begin() as connection:
        connection.execute(
            text("""
                UPDATE auth_rate_limits
                SET window_started_at =
                    CURRENT_TIMESTAMP - INTERVAL '16 minutes'
                WHERE ip_address = CAST(:ip_address AS INET)
                  AND action = :action;
            """),
            {
                "ip_address": client_ip,
                "action": action,
            },
        )

    deleted = auth_rate_limit_repository.delete_expired_auth_rate_limits()

    assert deleted >= 1

    with engine.connect() as connection:
        remaining = connection.execute(
            text("""
                SELECT HOST(ip_address)
                FROM auth_rate_limits
                WHERE action = :action;
            """),
            {"action": action},
        ).scalars().all()

    assert client_ip not in remaining
    assert active_ip in remaining


def test_cleanup_preserves_active_rate_limit(rate_limit_environment):
    _, client_ip, action = rate_limit_environment

    for _ in range(10):
        assert auth_rate_limit_repository.allow_auth_request(
            client_ip, action
        ) is True

    auth_rate_limit_repository.delete_expired_auth_rate_limits()

    # La limpieza no debe reiniciar un límite activo.
    assert auth_rate_limit_repository.allow_auth_request(
        client_ip, action
    ) is False