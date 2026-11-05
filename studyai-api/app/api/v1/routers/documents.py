import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from app.api.v1.dependencies import get_current_user
from app.repositories.document_access_repository import (
    delete_document_for_user,
    get_document_with_chunks_for_user,
    list_documents_for_user,
)
from app.repositories.document_repository import save_document_for_user
from app.services.document_embedding_service import (
    generate_and_save_document_embeddings,
)
from app.services.document_processing_service import process_pdf
from app.services.document_service import (
    MAX_FILE_SIZE,
    DocumentTooLargeError,
    InvalidDocumentError,
)


# Configuración del router
router = APIRouter(prefix="/documents", tags=["Documents"])
logger = logging.getLogger(__name__)



# Subir, procesar y guardar un PDF del usuario autenticado
@router.post(
    "/upload",
    status_code=200,
    responses={
        400: {"description": "Documento inválido"},
        401: {"description": "No autenticado"},
        413: {"description": "Documento demasiado grande"},
        500: {"description": "Error del servidor"},
    },
)
async def upload_document(
    current_user: Annotated[dict, Depends(get_current_user)],
    file: UploadFile = File(...),
):
    try:
        content = await file.read(MAX_FILE_SIZE + 1)

        try:
            result = await run_in_threadpool(
                process_pdf,
                file.filename,
                content,
            )
        except DocumentTooLargeError as exc:
            raise HTTPException(status_code=413, detail=str(exc)) from exc
        except InvalidDocumentError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        try:
            document_id = await run_in_threadpool(
                save_document_for_user,
                result,
                current_user["id"],
            )
        except SQLAlchemyError as exc:
            raise HTTPException(
                status_code=500,
                detail="Error interno al guardar el documento",
            ) from exc

        # El PDF y sus chunks ya están guardados.
        embedding_status = "pending"

        try:
            embedded_count = await run_in_threadpool(
                generate_and_save_document_embeddings,
                document_id,
                current_user["id"],
            )

            if embedded_count == len(result.chunks):
                embedding_status = "ready"

        except Exception:
            logger.exception(
                "Error generando embeddings del documento %s",
                document_id,
            )

        return {
            "message": "PDF procesado y guardado correctamente",
            "document_id": str(document_id),
            "filename": result.filename,
            "size_bytes": result.size_bytes,
            "pages_with_text": result.pages_with_text,
            "text_length": result.text_length,
            "chunk_count": len(result.chunks),
            "embedding_status": embedding_status,
        }

    finally:
        await file.close()


# Listar únicamente los documentos del usuario autenticado
@router.get(
    "",
    status_code=200,
    summary="Listar documentos",
    description="Consulta los documentos del usuario autenticado con paginación.",
    responses={
        401: {"description": "No autenticado"},
        500: {"description": "Error interno al consultar documentos"},
    },
)
async def get_documents(
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        documents = await run_in_threadpool(
            list_documents_for_user,
            current_user["id"],
            limit,
            offset,
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Error interno al consultar documentos",
        ) from exc

    return {
        "documents": documents,
        "count": len(documents),
        "limit": limit,
        "offset": offset,
    }


# Consultar un documento específico y sus fragmentos
@router.get(
    "/{document_id}",
    status_code=200,
    summary="Consultar documento por UUID",
    responses={
        401: {"description": "No autenticado"},
        404: {"description": "Documento no encontrado"},
        500: {"description": "Error al consultar PostgreSQL"},
    },
)
async def get_document(
    document_id: UUID,
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    try:
        # Consultar únicamente documentos y chunks propios
        result = await run_in_threadpool(
            get_document_with_chunks_for_user,
            document_id,
            current_user["id"],
            limit,
            offset,
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Error interno al consultar el documento",
        ) from exc

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Documento no encontrado",
        )

    return result


# Eliminar únicamente documentos del usuario autenticado
@router.delete(
    "/{document_id}",
    status_code=204,
    summary="Eliminar documento",
    responses={
        401: {"description": "No autenticado"},
        404: {"description": "Documento no encontrado"},
        500: {"description": "Error al eliminar el documento"},
    },
)
async def remove_document(
    document_id: UUID,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        deleted = await run_in_threadpool(
            delete_document_for_user,
            document_id,
            current_user["id"],
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Error interno al eliminar el documento",
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Documento no encontrado",
        )

    # 204 No Content: eliminación exitosa, sin cuerpo JSON
    return None