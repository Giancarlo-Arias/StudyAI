import re

from app.core.security import hash_email_verification_token
from app.repositories.email_verification_repository import (
    verify_email_verification_token,
)


TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")


def verify_user_email(token: str) -> bool:
    """Validar el formato del token y verificar el correo del usuario."""

    if not TOKEN_PATTERN.fullmatch(token):
        return False

    token_hash = hash_email_verification_token(token)

    return verify_email_verification_token(token_hash)