from app.core.security import hash_password, verify_password
from app.repositories.auth_repository import (
    get_user_for_authentication,
    get_user_password_hash,
    update_user_password_hash,
)


class InvalidCredentialsError(Exception):
    pass


class EmailNotVerifiedError(Exception):
    pass


class InvalidCurrentPasswordError(Exception):
    pass


class PasswordReuseError(Exception):
    pass


class PasswordChangeConflictError(Exception):
    pass


# Hash válido para evitar diferencias grandes de tiempo
# cuando el correo no existe.
_DUMMY_PASSWORD_HASH = hash_password("studyai-dummy-login-password")


def authenticate_user(email: str, password: str) -> dict:
    """Validar credenciales y comprobar que la cuenta puede iniciar sesión."""

    user = get_user_for_authentication(email)

    password_hash = (
        user["password_hash"]
        if user is not None
        else _DUMMY_PASSWORD_HASH
    )

    # Validar la contraseña mediante Argon2id.
    if not verify_password(password, password_hash):
        raise InvalidCredentialsError("Credenciales inválidas")

    if user is None or not user["is_active"]:
        raise InvalidCredentialsError("Credenciales inválidas")

    if user["email_verified_at"] is None:
        raise EmailNotVerifiedError("Debes verificar tu correo electrónico")

    return {
        "id": user["id"],
        "email": user["email"],
    }


def change_user_password(
    user_id: int,
    current_password: str,
    new_password: str,
) -> None:
    """Cambiar la contraseña del usuario autenticado."""

    # Obtener el hash actual desde PostgreSQL.
    current_hash = get_user_password_hash(user_id)

    # Verificar que la contraseña actual sea correcta.
    if current_hash is None or not verify_password(
        current_password,
        current_hash,
    ):
        raise InvalidCurrentPasswordError(
            "La contraseña actual es incorrecta"
        )

    # Evitar reutilizar la contraseña actual.
    if verify_password(new_password, current_hash):
        raise PasswordReuseError(
            "La nueva contraseña debe ser diferente de la actual"
        )

    # Generar el hash Argon2id de la nueva contraseña.
    new_hash = hash_password(new_password)

    # Guardar el hash únicamente si no ha cambiado durante la operación.
    updated = update_user_password_hash(
        user_id,
        current_hash,
        new_hash,
    )

    if not updated:
        raise PasswordChangeConflictError(
            "No se pudo actualizar la contraseña. Intenta nuevamente"
        )