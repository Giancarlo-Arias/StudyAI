from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from app.core.jwt_tokens import (
    InvalidAccessTokenError,
    decode_access_token,
)
from app.repositories.auth_repository import get_user_for_access


bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    """Devolver un error de autenticación uniforme."""

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> dict:
    """Validar el JWT y comprobar que el usuario sigue autorizado."""

    if credentials is None:
        raise _unauthorized()

    # Validar firma, expiración y tipo del JWT.
    try:
        user_id = decode_access_token(credentials.credentials)

    except InvalidAccessTokenError as exc:
        raise _unauthorized() from exc

    # Comprobar el estado actual del usuario en PostgreSQL.
    try:
        user = await run_in_threadpool(
            get_user_for_access,
            user_id,
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio temporalmente no disponible",
        ) from exc

    if user is None:
        raise _unauthorized()

    return user