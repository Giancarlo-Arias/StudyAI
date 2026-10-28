from ipaddress import ip_address

from sqlalchemy import text

from app.db.connection import get_engine


def allow_auth_request(client_ip: str, action: str) -> bool:
    """Permitir hasta 10 solicitudes por IP y operación cada 15 minutos."""

    # Validar y normalizar la dirección IP.
    normalized_ip = str(ip_address(client_ip))

    with get_engine().begin() as connection:
        result = connection.execute(
            text("""
                INSERT INTO auth_rate_limits (
                    ip_address,
                    action,
                    window_started_at,
                    request_count
                )
                VALUES (
                    CAST(:ip_address AS INET),
                    :action,
                    statement_timestamp(),
                    1
                )
                ON CONFLICT (ip_address, action)
                DO UPDATE SET
                    request_count = CASE
                        WHEN auth_rate_limits.window_started_at
                            <= statement_timestamp() - INTERVAL '15 minutes'
                        THEN 1
                        ELSE auth_rate_limits.request_count + 1
                    END,
                    window_started_at = CASE
                        WHEN auth_rate_limits.window_started_at
                            <= statement_timestamp() - INTERVAL '15 minutes'
                        THEN statement_timestamp()
                        ELSE auth_rate_limits.window_started_at
                    END
                WHERE auth_rate_limits.window_started_at
                        <= statement_timestamp() - INTERVAL '15 minutes'
                   OR auth_rate_limits.request_count < 10
                RETURNING request_count;
            """),
            {
                "ip_address": normalized_ip,
                "action": action,
            },
        ).scalar_one_or_none()

        return result is not None



def delete_expired_auth_rate_limits() -> int:
    """Eliminar contadores cuya ventana de 15 minutos terminó."""

    with get_engine().begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM auth_rate_limits
                WHERE window_started_at
                    <= statement_timestamp() - INTERVAL '15 minutes';
            """)
        )

        return result.rowcount