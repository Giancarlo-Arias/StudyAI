from app.core.security import hash_password, verify_password
from app.repositories.auth_repository import get_user_for_authentication


class InvalidCredentialsError(Exception):
    pass


class EmailNotVerifiedError(Exception):
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