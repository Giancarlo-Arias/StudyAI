
from fastapi import APIRouter, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.services.document_service import (
    MAX_FILE_SIZE,
    InvalidDocumentError,
    DocumentTooLargeError,
)

from app.services.document_processing_service import process_pdf

# Configuración del router
router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", status_code=200, summary="Subir y procesar documento PDF", description="Valida un PDF, extrae su texto y genera fragmentos.",
    responses={
        400: {"description": "Archivo PDF inválido o sin texto"},
        413: {"description": "El archivo supera el tamaño permitido"},
    },
)
async def upload_document(file: UploadFile = File(...)):
    try:
        # Leer únicamente hasta el límite permitido
        content = await file.read(MAX_FILE_SIZE + 1)

        try:
            # Procesar PDF fuera del ciclo de eventos
            result = await run_in_threadpool(process_pdf, file.filename, content)


        except DocumentTooLargeError as exc:
            raise HTTPException(status_code=413, detail=str(exc)) from exc

        except InvalidDocumentError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        
        # Devolver información del procesamiento
        return {
            "message": "PDF procesado correctamente",
            "filename": result.filename,
            "size_bytes": result.size_bytes,
            "pages_with_text": result.pages_with_text,
            "text_length": result.text_length,
            "chunk_count": len(result.chunks),
        }

    finally:
        # Cerrar archivo temporal
        await file.close()
