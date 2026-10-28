from sqlalchemy import text

from app.db.connection import get_engine


def get_user_for_authentication(email: str) -> dict | None:
    """Obtener los datos necesarios para autenticar un usuario."""

    with get_engine().connect() as connection:
        user = connection.execute(
            text("""
                SELECT
                    id,
                    email,
                    password_hash,
                    is_active,
                    email_verified_at
                FROM users
                WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:email))
                LIMIT 1;
            """),
            {"email": email},
        ).mappings().one_or_none()

        return dict(user) if user else None


def get_user_for_access(user_id: int) -> dict | None:
    """Obtener un usuario activo y con correo verificado."""

    with get_engine().connect() as connection:
        user = connection.execute(
            text("""
                SELECT
                    id,
                    full_name,
                    email
                FROM users
                WHERE id = :user_id
                  AND is_active = TRUE
                  AND email_verified_at IS NOT NULL;
            """),
            {"user_id": user_id},
        ).mappings().one_or_none()

        return dict(user) if user else None