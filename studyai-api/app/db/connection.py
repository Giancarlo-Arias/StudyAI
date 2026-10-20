from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, URL

from app.core.config import get_settings


# Crear y reutilizar el motor de conexión PostgreSQL
@lru_cache
def get_engine() -> Engine:
    settings = get_settings()

    if not settings.db_password:
        raise RuntimeError("DB_PASSWORD no está configurada")

    # Construir la URL sin exponer ni concatenar contraseñas
    url = URL.create(
        drivername="postgresql+psycopg",
        username=settings.db_user,
        password=settings.db_password,
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name
    )

    # Configurar SQLAlchemy
    return create_engine(
        url,
        pool_pre_ping=True
    )