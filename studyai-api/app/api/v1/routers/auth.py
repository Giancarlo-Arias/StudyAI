from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from app.schemas.user import UserRegister, UserPublic
from app.services.user_service import register_user
from app.repositories.user_repository import UserAlreadyExistsError


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
        # Ejecutar el registro fuera del ciclo de eventos
        user = await run_in_threadpool(
            register_user,
            data
        )

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