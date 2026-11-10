import hashlib
import hmac
import re
import secrets

from pwdlib import PasswordHash

from app.core.config import get_settings


# Configurar hashing seguro con Argon2id
password_hasher = PasswordHash.recommended()


# Generar un hash seguro de la contraseña
def hash_password(password: str) -> str:
    return password_hasher.hash(password)


# Comprobar que una contraseña coincide con su hash
def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


# Proteger el código de verificación mediante HMAC-SHA256
def hash_email_verification_code(email: str, code: str) -> str:
    """Generar un hash seguro asociado al correo del usuario."""

    if not re.fullmatch(r"[0-9]{6}", code):
        raise ValueError("El código debe contener 6 dígitos")

    settings = get_settings()

    secret = settings.email_verification_code_secret

    if len(secret.encode("utf-8")) < 32:
        raise RuntimeError(
            "EMAIL_VERIFICATION_CODE_SECRET debe tener "
            "al menos 32 bytes"
        )

    normalized_email = email.strip().lower()

    message = f"{normalized_email}:{code}"

    return hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# Generar un código numérico de 6 dígitos
def generate_email_verification_code(
    email: str,
) -> tuple[str, str]:
    """Generar un código y devolverlo junto con su hash."""

    code = f"{secrets.randbelow(1_000_000):06d}"

    code_hash = hash_email_verification_code(
        email,
        code,
    )

    return code, code_hash