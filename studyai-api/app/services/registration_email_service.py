import logging

import httpx
from resend.exceptions import ResendError
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.schemas.user import UserRegister
from app.services.email_service import send_verification_email
from app.services.user_service import register_user_with_verification


logger = logging.getLogger(__name__)


async def register_and_send_verification(data: UserRegister) -> dict:
    """Registrar un usuario y enviar su correo de verificación."""

    # Registrar el usuario y guardar el hash del token.
    user, token = await run_in_threadpool(
        register_user_with_verification,
        data,
    )

    settings = get_settings()

    # Enviar el token original por correo electrónico.
    try:
        await send_verification_email(
            to_email=str(data.email),
            token=token,
            api_key=settings.resend_api_key,
            sender_email=settings.resend_from_email,
            verification_page_url=settings.email_verification_url,
        )

    except (ResendError, httpx.RequestError, ValueError):
        # Conservar la cuenta para permitir solicitar otro correo.
        logger.exception("No se pudo enviar el correo de verificación")

    # Devolver únicamente los datos públicos del usuario.
    return user