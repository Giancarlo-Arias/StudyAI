from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ForgotPasswordRequest(BaseModel):
    """Validar el correo utilizado para solicitar una recuperación."""

    email: EmailStr

    model_config = ConfigDict(extra="forbid")


class ResetPasswordRequest(BaseModel):
    """Validar el token y la nueva contraseña del usuario."""

    token: str = Field(min_length=43, max_length=43)
    new_password: str = Field(min_length=12, max_length=128)

    model_config = ConfigDict(extra="forbid")