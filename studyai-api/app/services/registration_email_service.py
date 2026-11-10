import logging

import httpx
from resend.exceptions import ResendError
from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.schemas.user import UserRegister
from app.services.email_service import send_verification_code_email
from app.services.user_service import register_user_with_code_verification


logger = logging.getLogger(__name__)


async def register_and_send_code_verification(data: UserRegister) -> dict:
    """Registrar un usuario y enviar un código de verificación de seis dígitos."""

    # Registrar el usuario y guardar el HMAC del código en PostgreSQL.
    user, code = await run_in_threadpool(
        register_user_with_code_verification,
        data,
    )

    settings = get_settings()

    # Enviar el código original mediante Resend.
    try:
        await send_verification_code_email(
            to_email=str(data.email),
            code=code,
            api_key=settings.resend_api_key,
            sender_email=settings.resend_from_email,
        )

    except (ResendError, httpx.RequestError, ValueError, OSError):
        # Conservar la cuenta para permitir reenviar el código.
        logger.exception("No se pudo enviar el código de verificación")

    # Nunca devolver el código ni su hash al cliente.
    return user