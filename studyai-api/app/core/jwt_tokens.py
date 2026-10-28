from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import get_settings

class InvalidAccessTokenError(Exception):
    pass


def create_access_token(user_id: int) -> str:
    """Generar un JWT firmado para un usuario autenticado."""

    if isinstance(user_id, bool) or not isinstance(user_id, int) or user_id <= 0:
        raise ValueError("ID de usuario inválido")

    settings = get_settings()

    if len(settings.jwt_secret_key.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET_KEY debe tener al menos 32 bytes")

    if not 1 <= settings.jwt_access_token_expire_minutes <= 60:
        raise RuntimeError("Duración del JWT inválida")

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(
            minutes=settings.jwt_access_token_expire_minutes
        ),
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm="HS256",
    )


def decode_access_token(token: str) -> int:
    """Validar un JWT y devolver el ID del usuario."""

    settings = get_settings()

    if len(settings.jwt_secret_key.encode("utf-8")) < 32:
        raise RuntimeError("JWT_SECRET_KEY debe tener al menos 32 bytes")

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=["HS256"],
            options={"require": ["sub", "type", "iat", "exp"]},
        )
    except jwt.InvalidTokenError as exc:
        raise InvalidAccessTokenError("Token inválido o vencido") from exc

    if payload["type"] != "access":
        raise InvalidAccessTokenError("Tipo de token inválido")

    subject = payload["sub"]

    if not subject.isascii() or not subject.isdecimal():
        raise InvalidAccessTokenError("Usuario del token inválido")

    user_id = int(subject)

    if user_id <= 0:
        raise InvalidAccessTokenError("Usuario del token inválido")

    return user_id