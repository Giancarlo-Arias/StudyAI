import re

from starlette.concurrency import run_in_threadpool

from app.core.config import get_settings
from app.core.security import (
    generate_email_verification_code,
    hash_email_verification_code,
)
from app.repositories.email_verification_repository import (
    replace_email_verification_token_for_unverified_user,
    verify_email_verification_code,
)
from app.services.email_service import send_verification_code_email


CODE_PATTERN = re.compile(r"^[0-9]{6}$")


def verify_user_email_code(email: str, code: str) -> bool:
    """Validar un código de seis dígitos y verificar el correo."""

    if not CODE_PATTERN.fullmatch(code):
        return False

    code_hash = hash_email_verification_code(
        email,
        code,
    )

    return verify_email_verification_code(
        email,
        code_hash,
    )


def prepare_email_verification_code_resend(email: str) -> str | None:
    """Generar un código nuevo para una cuenta pendiente de verificación."""

    code, code_hash = generate_email_verification_code(
        email,
    )

    replaced = replace_email_verification_token_for_unverified_user(
        email,
        code_hash,
    )

    if not replaced:
        return None

    return code


async def resend_verification_code_email(email: str) -> bool:
    """Generar y reenviar un código de seis dígitos mediante Resend."""

    # Generar el código y actualizar su hash en PostgreSQL.
    # El repositorio exige esperar al menos 60 segundos.
    code = await run_in_threadpool(
        prepare_email_verification_code_resend,
        email,
    )

    # No enviar correos a cuentas inexistentes, verificadas
    # o que todavía no pueden solicitar otro código.
    if code is None:
        return False

    settings = get_settings()

    # Enviar el nuevo código usando su template independiente.
    await send_verification_code_email(
        to_email=email,
        code=code,
        api_key=settings.resend_api_key,
        sender_email=settings.resend_from_email,
    )

    return True