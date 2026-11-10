from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# Datos que recibiremos al registrar un usuario
class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)

    # Eliminar espacios innecesarios del nombre
    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        if isinstance(value, str):
            return " ".join(value.split())
        return value

    # Normalizar el correo electrónico
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


# Datos públicos devueltos por la API
class UserPublic(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    is_active: bool
    email_verified_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=2, max_length=150)

    @field_validator("full_name", mode="before")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        if isinstance(value, str):
            return " ".join(value.split())
        return value


class UserPasswordChange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


# Datos para verificar el correo con un código de seis dígitos
class EmailVerificationCodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    code: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^[0-9]{6}$",
    )

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class EmailVerificationResendRequest(BaseModel):
    email: EmailStr


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr