
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool
from uuid import UUID

from app.services.document_service import (
    MAX_FILE_SIZE,
    InvalidDocumentError,
    DocumentTooLargeError,
)

from app.services.document_processing_service import process_pdf
from app.repositories.document_repository import (
    save_document,
    list_documents,
    get_document_by_id,
    delete_document,
)


# Configuración del router
router = APIRouter(prefix="/documents", tags=["Documents"])



# Subir, procesar y guardar un PDF
@router.post("/upload", status_code=200, summary="Subir y guardar documento PDF", description="Valida un PDF, extrae su texto, genera fragmentos y los guarda.",
    responses={
        400: {"description": "Archivo PDF inválido o sin texto"},
        413: {"description": "El archivo supera el tamaño permitido"},
        500: {"description": "Error interno al guardar el documento"},
    },
)
async def upload_document(file: UploadFile = File(...)):
    try:
        # Leer únicamente hasta el límite permitido
        content = await file.read(MAX_FILE_SIZE + 1)

        try:
            # Procesar PDF fuera del ciclo de eventos
            result = await run_in_threadpool(
                process_pdf, 
                file.filename, 
                content
            )


        except DocumentTooLargeError as exc:
            raise HTTPException(status_code=413, detail=str(exc)) from exc

        except InvalidDocumentError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        # Guardar documento y chunks en PostgreSQL
        try:
            document_id = await run_in_threadpool(
                save_document,
                result
            )
        
        except SQLAlchemyError as exc:
            # No exponer detalles internos de PostgreSQL
            raise HTTPException(status_code=500, detail="Error interno al guardar el documento") from exc

        
        # Devolver información del documento guardado
        return {
            "message": "PDF procesado y guardado correctamente",
            "document_id": str(document_id),
            "filename": result.filename,
            "size_bytes": result.size_bytes,
            "pages_with_text": result.pages_with_text,
            "text_length": result.text_length,
            "chunk_count": len(result.chunks),
        }

    finally:
        # Cerrar archivo temporal
        await file.close()


# Listar los documentos almacenados
@router.get( "", status_code=200, summary="Listar documentos", description="Consulta metadatos de documentos con paginación.")
async def get_documents(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    try:
        # Consultar PostgreSQL sin bloquear FastAPI
        documents = await run_in_threadpool(
            list_documents,
            limit=limit,
            offset=offset
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Error interno al consultar documentos"
        ) from exc

    return {
        "documents": documents,
        "count": len(documents),
        "limit": limit,
        "offset": offset
    }


# Consultar un documento específico y sus fragmentos
@router.get(
    "/{document_id}",
    status_code=200,
    summary="Consultar documento por UUID",
    responses={
        404: {"description": "Documento no encontrado"},
        500: {"description": "Error al consultar PostgreSQL"},
    },
)
async def get_document(
    document_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    try:
        # Consultar documento y chunks sin bloquear FastAPI
        result = await run_in_threadpool(
            get_document_by_id,
            document_id,
            limit,
            offset
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Error interno al consultar el documento"
        ) from exc

    # UUID válido, pero el documento no existe
    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Documento no encontrado"
        )

    return result


# Eliminar documento y chunks por UUID
@router.delete(
    "/{document_id}",
    status_code=204,
    summary="Eliminar documento",
    responses={
        404: {"description": "Documento no encontrado"},
        500: {"description": "Error al eliminar el documento"},
    },
)
async def remove_document(document_id: UUID):
    try:
        deleted = await run_in_threadpool(
            delete_document,
            document_id
        )

    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=500,
            detail="Error interno al eliminar el documento"
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Documento no encontrado"
        )

    # 204 No Content: eliminación exitosa, sin cuerpo JSON
    return None