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
    password_hash: str
) -> dict:

    try:
        # Abrir transacción
        with get_engine().begin() as connection:

            # Crear usuario con valores parametrizados
            result = connection.execute(
                text("""
                    INSERT INTO users (
                        full_name,
                        email,
                        password_hash
                    )
                    VALUES (
                        :full_name,
                        LOWER(BTRIM(:email)),
                        :password_hash
                    )
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
                    "password_hash": password_hash
                }
            )

            # No devolver la contraseña ni su hash
            return dict(result.mappings().one())

    except IntegrityError as exc:

        # Identificar el error generado por PostgreSQL
        sqlstate = getattr(exc.orig, "sqlstate", None)

        constraint = getattr(
            getattr(exc.orig, "diag", None),
            "constraint_name",
            None
        )

        # El índice único impide correos duplicados
        if sqlstate == "23505" and constraint == "ux_users_email_lower":
            raise UserAlreadyExistsError(
                "Ya existe una cuenta con ese correo"
            ) from exc

        # No ocultar otros errores de integridad
        raise