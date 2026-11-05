
from fastapi import APIRouter

from app.api.v1.routers.health import router as health_router
from app.api.v1.routers.documents import router as documents_router
from app.api.v1.routers import auth
from app.api.v1.routers import semantic_search
from app.api.v1.routers import quizzes
from app.api.v1.routers import progress
from app.api.v1.routers import achievements
from app.api.v1.routers import dashboard


router = APIRouter()

router.include_router(health_router)
router.include_router(documents_router)
router.include_router(auth.router)
router.include_router(semantic_search.router)
router.include_router(quizzes.router)
router.include_router(progress.router)
router.include_router(achievements.router)
router.include_router(dashboard.router)