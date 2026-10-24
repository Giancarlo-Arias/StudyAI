from pwdlib import PasswordHash


# Configurar hashing seguro con Argon2id
password_hasher = PasswordHash.recommended()


# Generar un hash seguro de la contraseña
def hash_password(password: str) -> str:
    return password_hasher.hash(password)


# Comprobar que una contraseña coincide con su hash
def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)