import hmac

from sqlalchemy import text

from app.db.connection import get_engine


def save_email_verification_token(user_id: int, token_hash: str) -> None:
    """Guardar o reemplazar el hash de verificación de un usuario."""

    with get_engine().begin() as connection:
        connection.execute(
            text("""
                INSERT INTO email_verification_tokens (
                    user_id,
                    token_hash,
                    failed_attempts
                )
                VALUES (
                    :user_id,
                    :token_hash,
                    0
                )
                ON CONFLICT (user_id)
                DO UPDATE SET
                    token_hash = EXCLUDED.token_hash,
                    failed_attempts = 0,
                    expires_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes',
                    created_at = CURRENT_TIMESTAMP;
            """),
            {
                "user_id": user_id,
                "token_hash": token_hash,
            },
        )


def replace_email_verification_token_for_unverified_user(
    email: str,
    token_hash: str,
) -> bool:
    """Reemplazar el hash respetando el intervalo entre reenvíos."""

    with get_engine().begin() as connection:
        # Bloquear al usuario durante la operación.
        user_id = connection.execute(
            text("""
                SELECT id
                FROM users
                WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:email))
                  AND email_verified_at IS NULL
                  AND is_active = TRUE
                FOR UPDATE;
            """),
            {"email": email},
        ).scalar_one_or_none()

        if user_id is None:
            return False

        # Reemplazar únicamente si pasaron al menos 60 segundos.
        result = connection.execute(
            text("""
                INSERT INTO email_verification_tokens (
                    user_id,
                    token_hash,
                    failed_attempts
                )
                VALUES (
                    :user_id,
                    :token_hash,
                    0
                )
                ON CONFLICT (user_id)
                DO UPDATE SET
                    token_hash = EXCLUDED.token_hash,
                    failed_attempts = 0,
                    expires_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes',
                    created_at = CURRENT_TIMESTAMP
                WHERE email_verification_tokens.created_at
                    <= clock_timestamp() - INTERVAL '60 seconds'
                RETURNING user_id;
            """),
            {
                "user_id": user_id,
                "token_hash": token_hash,
            },
        ).scalar_one_or_none()

        return result is not None


def verify_email_verification_code(
    email: str,
    code_hash: str,
) -> bool:
    """Verificar el código de seis dígitos y limitar los intentos."""

    with get_engine().begin() as connection:
        # Bloquear al usuario para evitar conflictos con el reenvío.
        user_id = connection.execute(
            text("""
                SELECT id
                FROM users
                WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:email))
                  AND email_verified_at IS NULL
                  AND is_active = TRUE
                FOR UPDATE;
            """),
            {"email": email},
        ).scalar_one_or_none()

        if user_id is None:
            return False

        # Consultar el código y bloquear su registro durante la verificación.
        token = connection.execute(
            text("""
                SELECT
                    token_hash,
                    failed_attempts,
                    expires_at > clock_timestamp() AS is_not_expired
                FROM email_verification_tokens
                WHERE user_id = :user_id
                FOR UPDATE;
            """),
            {"user_id": user_id},
        ).mappings().one_or_none()

        if token is None:
            return False

        # Rechazar códigos vencidos o que agotaron sus intentos.
        if not token["is_not_expired"]:
            return False

        if token["failed_attempts"] >= 5:
            return False

        # Comparar los hashes sin utilizar una comparación directa de strings.
        if not hmac.compare_digest(
            token["token_hash"],
            code_hash,
        ):
            # Registrar cada intento fallido hasta alcanzar cinco.
            connection.execute(
                text("""
                    UPDATE email_verification_tokens
                    SET failed_attempts = failed_attempts + 1
                    WHERE user_id = :user_id
                      AND failed_attempts < 5;
                """),
                {"user_id": user_id},
            )

            return False

        # Consumir el código válido para impedir que vuelva a utilizarse.
        consumed_token = connection.execute(
            text("""
                DELETE FROM email_verification_tokens
                WHERE user_id = :user_id
                  AND token_hash = :code_hash
                  AND expires_at > clock_timestamp()
                  AND failed_attempts < 5
                RETURNING user_id;
            """),
            {
                "user_id": user_id,
                "code_hash": code_hash,
            },
        ).scalar_one_or_none()

        if consumed_token is None:
            return False

        # Marcar el correo como verificado dentro de la misma transacción.
        result = connection.execute(
            text("""
                UPDATE users
                SET email_verified_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :user_id
                  AND email_verified_at IS NULL;
            """),
            {"user_id": user_id},
        )

        if result.rowcount != 1:
            raise RuntimeError("No se pudo completar la verificación")

        return True


def delete_email_verification_token(user_id: int) -> bool:
    """Eliminar el código asociado a un usuario."""

    with get_engine().begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM email_verification_tokens
                WHERE user_id = :user_id;
            """),
            {"user_id": user_id},
        )

        return result.rowcount > 0


def delete_expired_email_verification_tokens() -> int:
    """Eliminar los códigos cuyo tiempo de validez terminó."""

    with get_engine().begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM email_verification_tokens
                WHERE expires_at <= CURRENT_TIMESTAMP;
            """)
        )

        return result.rowcount