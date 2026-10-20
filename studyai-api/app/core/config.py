
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Aplicación 
    app_name: str = "StudyAI API"
    app_version: str = "0.1.0"
    debug: bool = False
    cors_origins: list[str] = []

    # PostgreSQL
    db_host: str = "127.0.0.1"
    db_port: int = 5433
    db_name: str = "studyai_db"
    db_user: str = "studyai"
    db_password: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
