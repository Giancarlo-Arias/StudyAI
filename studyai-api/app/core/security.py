import hashlib
import secrets

from pwdlib import PasswordHash


# Configurar hashing seguro con Argon2id
password_hasher = PasswordHash.recommended()


# Generar un hash seguro de la contraseña
def hash_password(password: str) -> str:
    return password_hasher.hash(password)


# Comprobar que una contraseña coincide con su hash
def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)

def hash_email_verification_token(token: str) -> str:
    """Generar el hash SHA-256 de un token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_email_verification_token() -> tuple[str, str]:
    """Generar un token seguro y su hash."""
    token = secrets.token_urlsafe(32)
    token_hash = hash_email_verification_token(token)

    return token, token_hash