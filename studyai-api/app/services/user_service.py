from app.core.security import (
    generate_email_verification_code,
    hash_password,
)
from app.repositories.user_repository import create_user
from app.schemas.user import UserRegister


def register_user_with_code_verification(data: UserRegister) -> tuple[dict, str]:
    """Registrar el usuario y generar su código de seis dígitos."""

    # Proteger la contraseña mediante Argon2id.
    password_hash = hash_password(data.password)

    # Generar el código y su HMAC asociado al correo.
    code, code_hash = generate_email_verification_code(
        str(data.email),
    )

    # Guardar al usuario y el hash del código en una transacción.
    user = create_user(
        full_name=data.full_name,
        email=str(data.email),
        password_hash=password_hash,
        verification_token_hash=code_hash,
    )

    # El código original solo se devuelve para enviarlo por correo.
    return user, code


def register_user(data: UserRegister) -> dict:
    """Registrar un usuario y devolver únicamente sus datos públicos."""

    user, _ = register_user_with_code_verification(data)

    return user