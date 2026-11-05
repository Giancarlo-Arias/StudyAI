
# Librerías
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Configuración interna
from app.core.config import get_settings
from app.core.exceptions import unhandled_exception_handler

# Routers
from app.api.v1.router import router as api_router

# Cargar configuración centralizada
settings = get_settings()

# Inicializar aplicación
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

# Manejo global de errores inesperados
app.add_exception_handler(
    Exception,
    unhandled_exception_handler
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"]
)

#Registrar routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
def home():
    return {"message": "StudyAI API funcionando"}
