from html import escape
from urllib.parse import urlencode, urlsplit

import resend


def build_verification_link(verification_page_url: str, token: str) -> str:
    """Construir el enlace de verificación del correo."""

    parsed = urlsplit(verification_page_url)

    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or parsed.query
        or parsed.fragment
    ):
        raise ValueError("URL de verificación inválida")

    query = urlencode({"token": token})

    return f"{verification_page_url}?{query}"


async def send_verification_email(
    to_email: str,
    token: str,
    *,
    api_key: str,
    sender_email: str,
    verification_page_url: str,
) -> None:
    """Enviar el enlace de verificación mediante Resend."""

    if not api_key or not sender_email:
        raise ValueError("Configuración de correo incompleta")

    verification_link = build_verification_link(
        verification_page_url,
        token,
    )

    safe_link = escape(verification_link, quote=True)

    resend.api_key = api_key

    await resend.Emails.send_async({
        "from": sender_email,
        "to": [to_email],
        "subject": "Verifica tu correo electrónico - StudyAI",
        "text": (
            "Confirma tu correo electrónico para utilizar StudyAI.\n\n"
            f"{verification_link}\n\n"
            "El enlace vence en 5 minutos."
        ),
        "html": (
            "<h2>Verifica tu correo electrónico</h2>"
            "<p>Confirma tu correo para utilizar StudyAI.</p>"
            f'<p><a href="{safe_link}">Verificar correo</a></p>'
            "<p>Este enlace vence en 5 minutos.</p>"
        ),
    })