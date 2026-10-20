from logging.config import fileConfig

from alembic import context

from app.db.connection import get_engine


# Configuración principal de Alembic
config = context.config

# Configurar los registros de ejecución
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# Aquí registraremos los modelos de SQLAlchemy.
# Se actualizará cuando creemos nuestra clase Base.
target_metadata = None


# Generar migraciones SQL sin conectarse a PostgreSQL
def run_migrations_offline() -> None:
    engine = get_engine()

    context.configure(
        url=engine.url.render_as_string(hide_password=False),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


# Ejecutar migraciones conectándose a PostgreSQL
def run_migrations_online() -> None:
    with get_engine().connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


# Seleccionar automáticamente el modo de ejecución
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()