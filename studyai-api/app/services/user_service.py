from app.core.security import (
    generate_email_verification_token,
    hash_password,
)
from app.repositories.user_repository import create_user
from app.schemas.user import UserRegister


def register_user(data: UserRegister) -> dict:
    """Registrar un usuario y generar su token de verificación."""

    password_hash = hash_password(data.password)
    token, token_hash = generate_email_verification_token()

    user = create_user(
        full_name=data.full_name,
        email=str(data.email),
        password_hash=password_hash,
        verification_token_hash=token_hash,
    )

    return user