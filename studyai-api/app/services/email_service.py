import re

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


def _render_verification_code_email(
    code: str,
) -> tuple[str, str]:
    """Generar el HTML y texto del correo con código de verificación."""

    html_template = Template(
        (TEMPLATES_DIR / "verification_code.html").read_text(
            encoding="utf-8",
        )
    )

    text_template = Template(
        (TEMPLATES_DIR / "verification_code.txt").read_text(
            encoding="utf-8",
        )
    )

    html = html_template.substitute(
        code=escape(code, quote=True),
    )

    plain_text = text_template.substitute(
        code=code,
    )

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


async def send_verification_code_email(
    to_email: str,
    code: str,
    *,
    api_key: str,
    sender_email: str,
) -> None:
    """Enviar un código de verificación de seis dígitos mediante Resend."""

    # Validar que el código contenga exactamente seis dígitos.
    if not re.fullmatch(r"[0-9]{6}", code):
        raise ValueError("Código de verificación inválido")

    if not api_key or not sender_email:
        raise ValueError("Configuración de correo incompleta")

    # Obtener el HTML y texto desde templates independientes.
    html, plain_text = _render_verification_code_email(
        code,
    )

    resend.api_key = api_key

    await resend.Emails.send_async({
        "from": sender_email,
        "to": [to_email],
        "subject": "Tu código de verificación - StudyAI",
        "text": plain_text,
        "html": html,
    })