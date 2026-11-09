import hashlib
import re
import secrets

from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.security import hash_password
from app.repositories.password_reset_repository import (
    consume_password_reset_token,
    save_password_reset_token,
)
from app.services.email_service import send_password_reset_email


TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")

PASSWORD_RESET_EXPIRATION_MINUTES = 30


def generate_password_reset_token() -> tuple[str, str]:
    """Generar un token seguro y su hash SHA-256."""

    token = secrets.token_urlsafe(32)

    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    return token, token_hash


async def request_password_reset(
    email: str,
    reset_page_url: str,
) -> bool:
    """Solicitar o reenviar un correo de recuperación de contraseña."""

    # Generar un token seguro sin almacenar su valor original.
    token, token_hash = generate_password_reset_token()

    # Guardar el hash únicamente para un usuario válido.
    # El repositorio controla el intervalo de 60 segundos.
    recipient_email = await run_in_threadpool(
        save_password_reset_token,
        email,
        token_hash,
    )

    if recipient_email is None:
        return False

    settings = get_settings()

    # Enviar el enlace temporal mediante Resend.
    await send_password_reset_email(
        to_email=recipient_email,
        token=token,
        api_key=settings.resend_api_key,
        sender_email=settings.resend_from_email,
        reset_page_url=reset_page_url,
        expires_in_minutes=PASSWORD_RESET_EXPIRATION_MINUTES,
    )

    return True


async def reset_user_password(
    token: str,
    new_password: str,
) -> bool:
    """Restablecer la contraseña mediante un token de un solo uso."""

    # Rechazar tokens con formato inválido.
    if not TOKEN_PATTERN.fullmatch(token):
        return False

    # Validar la longitud de la nueva contraseña.
    if not 12 <= len(new_password) <= 128:
        return False

    # Calcular el hash del token recibido.
    token_hash = hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()

    # Generar el nuevo hash Argon2id sin bloquear el event loop.
    new_password_hash = await run_in_threadpool(
        hash_password,
        new_password,
    )

    # Actualizar la contraseña y consumir el token
    # dentro de una única transacción de PostgreSQL.
    return await run_in_threadpool(
        consume_password_reset_token,
        token_hash,
        new_password_hash,
    )