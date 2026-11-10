
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

    # Resend email configuration
    resend_api_key: str = ""
    resend_from_email: str = ""
    email_verification_url: str = ""
    password_reset_url: str = ""
    email_verification_code_secret: str = ""

    # JWT configuration
    jwt_secret_key: str = ""
    jwt_access_token_expire_minutes: int = 15


    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
