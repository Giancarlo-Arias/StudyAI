from sqlalchemy import text

from app.db.connection import get_engine


def save_email_verification_token(user_id: int, token_hash: str) -> None:
    """Guardar o reemplazar el token de verificación de un usuario."""

    with get_engine().begin() as connection:
        connection.execute(
            text("""
                INSERT INTO email_verification_tokens (
                    user_id,
                    token_hash
                )
                VALUES (
                    :user_id,
                    :token_hash
                )
                ON CONFLICT (user_id)
                DO UPDATE SET
                    token_hash = EXCLUDED.token_hash,
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
    """Reemplazar el token respetando el intervalo entre reenvíos."""

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
                    token_hash
                )
                VALUES (
                    :user_id,
                    :token_hash
                )
                ON CONFLICT (user_id)
                DO UPDATE SET
                    token_hash = EXCLUDED.token_hash,
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


def verify_email_verification_token(token_hash: str) -> bool:
    """Verificar el correo y consumir el token en una transacción."""

    with get_engine().begin() as connection:
        user_id = connection.execute(
            text("""
                SELECT user_id
                FROM email_verification_tokens
                WHERE token_hash = :token_hash;
            """),
            {"token_hash": token_hash},
        ).scalar_one_or_none()

        if user_id is None:
            return False

        # Bloquear al usuario para coordinar verificación y reenvío.
        active_user_id = connection.execute(
            text("""
                SELECT id
                FROM users
                WHERE id = :user_id
                  AND email_verified_at IS NULL
                  AND is_active = TRUE
                FOR UPDATE;
            """),
            {"user_id": user_id},
        ).scalar_one_or_none()

        if active_user_id is None:
            return False

        # Consumir únicamente un token válido.
        consumed_token = connection.execute(
            text("""
                DELETE FROM email_verification_tokens
                WHERE user_id = :user_id
                  AND token_hash = :token_hash
                  AND expires_at > clock_timestamp()
                RETURNING user_id;
            """),
            {
                "user_id": user_id,
                "token_hash": token_hash,
            },
        ).scalar_one_or_none()

        if consumed_token is None:
            return False

        # Marcar el correo como verificado.
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
    """Eliminar el token asociado a un usuario."""

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
    """Eliminar los tokens cuyo tiempo de validez terminó."""

    with get_engine().begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM email_verification_tokens
                WHERE expires_at <= CURRENT_TIMESTAMP;
            """)
        )

        return result.rowcount