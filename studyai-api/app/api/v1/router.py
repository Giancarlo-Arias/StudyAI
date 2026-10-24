
from fastapi import APIRouter

from app.api.v1.routers.health import router as health_router
from app.api.v1.routers.documents import router as documents_router
from app.api.v1.routers import auth
router = APIRouter()

router.include_router(health_router)
router.include_router(documents_router)
router.include_router(auth.router)
