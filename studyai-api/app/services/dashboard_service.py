from app.repositories.achievement_repository import (
    get_achievements_for_user,
)
from app.repositories.document_progress_repository import (
    list_document_progress_for_user,
)
from app.repositories.progress_repository import (
    get_progress_for_user,
)


def get_dashboard_for_user(user_id: int) -> dict:
    # Validar usuario
    if type(user_id) is not int or user_id <= 0:
        raise ValueError("El usuario no es válido")

    # Reutilizar los repositorios existentes
    progress = get_progress_for_user(user_id)
    documents = list_document_progress_for_user(user_id)
    achievements = get_achievements_for_user(user_id)

    return {
        "progress": progress,
        "documents": documents,
        "achievements": achievements,
    }