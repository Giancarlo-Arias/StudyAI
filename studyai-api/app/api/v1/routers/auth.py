import logging
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from resend.exceptions import ResendError
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from app.api.v1.dependencies import get_current_user
from app.core.jwt_tokens import create_access_token
from app.repositories.auth_rate_limit_repository import allow_auth_request
from app.repositories.user_repository import UserAlreadyExistsError
from app.schemas.user import (
    AccessTokenResponse,
    CurrentUserResponse,
    EmailVerificationRequest,
    EmailVerificationResendRequest,
    UserLogin,
    UserPublic,
    UserRegister,
)

from app.services.auth_service import (
    EmailNotVerifiedError,
    InvalidCredentialsError,
    authenticate_user,
)

from app.services.email_verification_service import (
    resend_verification_email,
    verify_user_email,
)
from app.services.registration_email_service import register_and_send_verification


logger = logging.getLogger(__name__)

# Configuración del router de autenticación
router = APIRouter(prefix="/auth", tags=["Auth"])


# Registrar un usuario nuevo
@router.post(
    "/register",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar usuario",
    description="Registra un usuario con contraseña protegida mediante Argon2id.",
    responses={
        409: {"description": "Correo electrónico ya registrado"},
        422: {"description": "Datos de registro inválidos"},
        500: {"description": "Error interno al registrar el usuario"},
    },
)
async def register(data: UserRegister):

    try:
        # Registrar el usuario y enviar su correo de verificación
        user = await register_and_send_verification(data)

    except UserAlreadyExistsError as exc:
        # El índice UNIQUE detectó un correo duplicado
        raise HTTPException(
            status_code=409,
            detail="Ya existe una cuenta con ese correo"
        ) from exc

    except SQLAlchemyError as exc:
        # Evitar exponer información interna de PostgreSQL
        raise HTTPException(
            status_code=500,
            detail="Error interno al registrar el usuario"
        ) from exc

    # FastAPI filtra la respuesta usando UserPublic
    return user


# Verificar el correo electrónico mediante un token
@router.post(
    "/verify-email",
    status_code=status.HTTP_200_OK,
    summary="Verificar correo electrónico",
    responses={
        400: {"description": "Token inválido, vencido o utilizado"},
        422: {"description": "Datos inválidos"},
        500: {"description": "Error interno"},
    },
)
async def verify_email(data: EmailVerificationRequest):

    try:
        verified = await run_in_threadpool(
            verify_user_email,
            data.token,
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Error interno al verificar el correo",
        ) from exc

    if not verified:
        raise HTTPException(
            status_code=400,
            detail="Token inválido, vencido o utilizado",
        )

    return {"message": "Correo verificado correctamente"}


# Reenviar el correo de verificación
@router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
    summary="Reenviar correo de verificación",
    responses={
        429: {"description": "Límite de solicitudes alcanzado"},
        422: {"description": "Datos inválidos"},
        503: {"description": "Servicio temporalmente no disponible"},
    },
)
async def resend_verification(
    data: EmailVerificationResendRequest,
    request: Request,
):
    """Reenviar la verificación aplicando el límite por IP."""

    client_ip = request.client.host if request.client else None

    if client_ip is None:
        raise HTTPException(
            status_code=503,
            detail="No se pudo procesar la solicitud",
        )

    # Comprobar el límite por IP antes de acceder a la cuenta.
    try:
        allowed = await run_in_threadpool(
            allow_auth_request,
            client_ip,
            "resend_verification",
        )

    except (SQLAlchemyError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail="No se pudo procesar la solicitud",
        ) from exc

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Demasiadas solicitudes. Intenta más tarde",
        )

    # No revelar si el correo existe o está verificado.
    try:
        await resend_verification_email(str(data.email))

    except (SQLAlchemyError, ResendError, httpx.RequestError):
        logger.exception("Error al procesar el reenvío de verificación")

    return {
        "message": (
            "Si la cuenta está pendiente de verificación, "
            "recibirás un correo con instrucciones"
        )
    }



# Iniciar sesión y generar el token de acceso JWT
@router.post(
    "/login",
    response_model=AccessTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión",
    description="Autentica al usuario y devuelve un JWT de acceso.",
    responses={
        401: {"description": "Credenciales inválidas"},
        403: {"description": "Correo electrónico sin verificar"},
        422: {"description": "Datos inválidos"},
        429: {"description": "Límite de solicitudes alcanzado"},
        503: {"description": "Servicio temporalmente no disponible"},
    },
)
async def login(data: UserLogin, request: Request):
    client_ip = request.client.host if request.client else None

    if client_ip is None:
        raise HTTPException(
            status_code=503,
            detail="Servicio temporalmente no disponible",
        )

    try:
        allowed = await run_in_threadpool(
            allow_auth_request,
            client_ip,
            "login",
        )
    except (SQLAlchemyError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Servicio temporalmente no disponible",
        ) from exc

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Demasiados intentos. Intenta más tarde",
        )

    try:
        user = await run_in_threadpool(
            authenticate_user,
            str(data.email),
            data.password,
        )

    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    except EmailNotVerifiedError as exc:
        raise HTTPException(
            status_code=403,
            detail="Debes verificar tu correo electrónico",
        ) from exc

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Servicio temporalmente no disponible",
        ) from exc

    try:
        access_token = create_access_token(user["id"])
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Servicio temporalmente no disponible",
        ) from exc

    return AccessTokenResponse(access_token=access_token)


# Obtener el perfil del usuario autenticado
@router.get(
    "/me",
    response_model=CurrentUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener usuario autenticado",
    description="Devuelve los datos públicos del usuario autenticado mediante JWT.",
    responses={
        401: {"description": "Token inválido o usuario no autorizado"},
        503: {"description": "Servicio temporalmente no disponible"},
    },
)
async def get_my_profile(
    current_user: Annotated[dict, Depends(get_current_user)],
):
    return current_user