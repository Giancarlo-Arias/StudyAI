from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.db.connection import get_engine


# Error específico para correos registrados previamente
class UserAlreadyExistsError(Exception):
    pass


# Registrar un nuevo usuario en PostgreSQL
def create_user(
    full_name: str,
    email: str,
    password_hash: str,
    verification_token_hash: str | None = None,
) -> dict:
    try:
        with get_engine().begin() as connection:
            result = connection.execute(
                text("""
                    INSERT INTO users (full_name, email, password_hash)
                    VALUES (:full_name, LOWER(BTRIM(:email)), :password_hash)
                    RETURNING
                        id,
                        full_name,
                        email,
                        is_active,
                        email_verified_at,
                        created_at,
                        updated_at;
                """),
                {
                    "full_name": full_name,
                    "email": email,
                    "password_hash": password_hash,
                },
            )

            user = dict(result.mappings().one())

            if verification_token_hash is not None:
                connection.execute(
                    text("""
                        INSERT INTO email_verification_tokens (
                            user_id,
                            token_hash
                        )
                        VALUES (:user_id, :token_hash);
                    """),
                    {
                        "user_id": user["id"],
                        "token_hash": verification_token_hash,
                    },
                )

            return user

    except IntegrityError as exc:
        sqlstate = getattr(exc.orig, "sqlstate", None)
        constraint = getattr(
            getattr(exc.orig, "diag", None),
            "constraint_name",
            None,
        )

        if sqlstate == "23505" and constraint == "ux_users_email_lower":
            raise UserAlreadyExistsError(
                "Ya existe una cuenta con ese correo"
            ) from exc

        raise