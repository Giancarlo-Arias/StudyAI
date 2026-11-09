from sqlalchemy import text

from app.db.connection import get_engine


def save_password_reset_token(
    email: str,
    token_hash: str,
) -> str | None:
    """Guardar un token de recuperación respetando el intervalo de reenvío."""

    with get_engine().begin() as connection:
        # Buscar únicamente cuentas activas y con correo verificado.
        user = connection.execute(
            text("""
                SELECT
                    id,
                    email
                FROM users
                WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:email))
                  AND is_active = TRUE
                  AND email_verified_at IS NOT NULL
                FOR UPDATE;
            """),
            {"email": email},
        ).mappings().one_or_none()

        if user is None:
            return None

        # Crear el token o reemplazarlo después de 60 segundos.
        result = connection.execute(
            text("""
                INSERT INTO password_reset_tokens (
                    user_id,
                    token_hash,
                    expires_at,
                    created_at
                )
                VALUES (
                    :user_id,
                    :token_hash,
                    clock_timestamp() + INTERVAL '30 minutes',
                    clock_timestamp()
                )
                ON CONFLICT (user_id)
                DO UPDATE SET
                    token_hash = EXCLUDED.token_hash,
                    expires_at = EXCLUDED.expires_at,
                    created_at = EXCLUDED.created_at
                WHERE password_reset_tokens.created_at
                    <= clock_timestamp() - INTERVAL '60 seconds'
                RETURNING user_id;
            """),
            {
                "user_id": user["id"],
                "token_hash": token_hash,
            },
        ).scalar_one_or_none()

        if result is None:
            return None

        return user["email"]


def consume_password_reset_token(
    token_hash: str,
    new_password_hash: str,
) -> bool:
    """Actualizar la contraseña y consumir el token en una transacción."""

    with get_engine().begin() as connection:
        # Identificar al usuario asociado con el token.
        user_id = connection.execute(
            text("""
                SELECT user_id
                FROM password_reset_tokens
                WHERE token_hash = :token_hash;
            """),
            {"token_hash": token_hash},
        ).scalar_one_or_none()

        if user_id is None:
            return False

        # Bloquear al usuario durante la recuperación.
        active_user_id = connection.execute(
            text("""
                SELECT id
                FROM users
                WHERE id = :user_id
                  AND is_active = TRUE
                  AND email_verified_at IS NOT NULL
                FOR UPDATE;
            """),
            {"user_id": user_id},
        ).scalar_one_or_none()

        if active_user_id is None:
            return False

        # Eliminar únicamente un token válido y no expirado.
        consumed_token = connection.execute(
            text("""
                DELETE FROM password_reset_tokens
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

        # Actualizar la contraseña con el nuevo hash Argon2id.
        result = connection.execute(
            text("""
                UPDATE users
                SET
                    password_hash = :new_password_hash,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :user_id
                  AND is_active = TRUE
                  AND email_verified_at IS NOT NULL;
            """),
            {
                "user_id": user_id,
                "new_password_hash": new_password_hash,
            },
        )

        if result.rowcount != 1:
            raise RuntimeError(
                "No se pudo completar la recuperación de contraseña"
            )

        return True


def delete_expired_password_reset_tokens() -> int:
    """Eliminar los tokens de recuperación expirados."""

    with get_engine().begin() as connection:
        result = connection.execute(
            text("""
                DELETE FROM password_reset_tokens
                WHERE expires_at <= clock_timestamp();
            """)
        )

        return result.rowcount