from app.core.security import hash_password
from app.repositories.user_repository import create_user
from app.schemas.user import UserRegister


# Coordinar el registro seguro de usuarios
def register_user(data: UserRegister) -> dict:

    # Generar hash Argon2id, nunca guardar texto plano
    password_hash = hash_password(data.password)

    # Registrar el usuario en PostgreSQL
    return create_user(
        full_name=data.full_name,
        email=str(data.email),
        password_hash=password_hash
    )