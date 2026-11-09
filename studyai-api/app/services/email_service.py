from functools import lru_cache
from html import escape
from pathlib import Path
from string import Template
from urllib.parse import urlencode, urlsplit

import resend


TEMPLATES_DIR = (
    Path(__file__).resolve().parent.parent
    / "templates"
    / "emails"
)


def _build_token_link(page_url: str, token: str) -> str:
    """Construir un enlace seguro con un token."""

    parsed = urlsplit(page_url)

    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("URL del enlace inválida")

    query = urlencode({"token": token})

    return f"{page_url}?{query}"


def build_verification_link(verification_page_url: str, token: str) -> str:
    """Construir el enlace de verificación del correo."""

    return _build_token_link(
        verification_page_url,
        token,
    )


def build_password_reset_link(reset_page_url: str, token: str) -> str:
    """Construir el enlace para recuperar la contraseña."""

    return _build_token_link(
        reset_page_url,
        token,
    )


def _render_email(
    *,
    preheader: str,
    title: str,
    description: str,
    button_label: str,
    action_url: str,
    expiration_notice: str,
    security_notice: str,
) -> tuple[str, str]:
    """Generar las versiones HTML y texto del correo."""

    values = {
        "preheader": preheader,
        "title": title,
        "description": description,
        "button_label": button_label,
        "action_url": action_url,
        "expiration_notice": expiration_notice,
        "security_notice": security_notice,
    }

    html_template = Template(
        (TEMPLATES_DIR / "action.html").read_text(
            encoding="utf-8",
        )
    )

    text_template = Template(
        (TEMPLATES_DIR / "action.txt").read_text(
            encoding="utf-8",
        )
    )

    safe_values = {
        key: escape(value, quote=True)
        for key, value in values.items()
    }

    html = html_template.substitute(safe_values)
    plain_text = text_template.substitute(values)

    return html, plain_text


async def _send_action_email(
    *,
    to_email: str,
    subject: str,
    api_key: str,
    sender_email: str,
    preheader: str,
    title: str,
    description: str,
    button_label: str,
    action_url: str,
    expiration_notice: str,
    security_notice: str,
) -> None:
    """Enviar un correo utilizando los templates de StudyAI."""

    if not api_key or not sender_email:
        raise ValueError("Configuración de correo incompleta")

    html, plain_text = _render_email(
        preheader=preheader,
        title=title,
        description=description,
        button_label=button_label,
        action_url=action_url,
        expiration_notice=expiration_notice,
        security_notice=security_notice,
    )

    resend.api_key = api_key

    await resend.Emails.send_async({
        "from": sender_email,
        "to": [to_email],
        "subject": subject,
        "text": plain_text,
        "html": html,
    })


async def send_verification_email(
    to_email: str,
    token: str,
    *,
    api_key: str,
    sender_email: str,
    verification_page_url: str,
) -> None:
    """Enviar el enlace de verificación mediante Resend."""

    verification_link = build_verification_link(
        verification_page_url,
        token,
    )

    await _send_action_email(
        to_email=to_email,
        subject="Verifica tu correo electrónico - StudyAI",
        api_key=api_key,
        sender_email=sender_email,
        preheader="Confirma tu correo para activar tu cuenta de StudyAI.",
        title="Confirma tu correo electrónico",
        description=(
            "¡Tu cuenta está casi lista! Confirma tu dirección "
            "de correo electrónico para comenzar a estudiar "
            "con StudyAI."
        ),
        button_label="Verificar mi correo",
        action_url=verification_link,
        expiration_notice=(
            "Por seguridad, este enlace vence en 5 minutos."
        ),
        security_notice=(
            "Si no creaste una cuenta en StudyAI, "
            "puedes ignorar este mensaje."
        ),
    )


async def send_password_reset_email(
    to_email: str,
    token: str,
    *,
    api_key: str,
    sender_email: str,
    reset_page_url: str,
    expires_in_minutes: int,
) -> None:
    """Enviar un enlace temporal para recuperar la contraseña."""

    reset_link = build_password_reset_link(
        reset_page_url,
        token,
    )

    await _send_action_email(
        to_email=to_email,
        subject="Recupera tu contraseña - StudyAI",
        api_key=api_key,
        sender_email=sender_email,
        preheader="Solicitaste restablecer tu contraseña de StudyAI.",
        title="Recupera tu contraseña",
        description=(
            "Recibimos una solicitud para restablecer "
            "la contraseña de tu cuenta. Utiliza el siguiente "
            "enlace para crear una nueva contraseña."
        ),
        button_label="Restablecer contraseña",
        action_url=reset_link,
        expiration_notice=(
            f"Por seguridad, este enlace vence en "
            f"{expires_in_minutes} minutos y solo puede utilizarse una vez."
        ),
        security_notice=(
            "Si no solicitaste cambiar tu contraseña, "
            "ignora este mensaje. Tu contraseña actual "
            "seguirá funcionando."
        ),
    )