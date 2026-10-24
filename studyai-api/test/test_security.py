from app.core.security import hash_password, verify_password


# Prueba 1: Crear un hash seguro
def test_hash_password():
    password = "StudyAI-Segura-2026!"

    hashed_password = hash_password(password)

    # No almacenar la contraseña original
    assert hashed_password != password

    # Comprobar que se utiliza Argon2id
    assert hashed_password.startswith("$argon2id$")

    # Verificar la contraseña correcta
    assert verify_password(password, hashed_password) is True

    # Rechazar una contraseña incorrecta
    assert verify_password("incorrecta", hashed_password) is False


# Prueba 2: Generar hashes diferentes para la misma contraseña
def test_password_uses_random_salt():
    password = "StudyAI-Segura-2026!"

    first_hash = hash_password(password)
    second_hash = hash_password(password)

    # La sal aleatoria produce hashes diferentes
    assert first_hash != second_hash

    # Ambos deben validar la misma contraseña
    assert verify_password(password, first_hash) is True
    assert verify_password(password, second_hash) is True