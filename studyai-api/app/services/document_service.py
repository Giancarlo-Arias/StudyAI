from dataclasses import dataclass
from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError

# Configuración
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

# Excepciones personalizadas
class InvalidDocumentError(Exception):
    pass


class DocumentTooLargeError(Exception):
    pass


# Estructura del texto extraído
@dataclass(frozen=True)
class ExtractedPage:
    page_number: int
    text: str


# Validación del PDF
def validate_pdf(filename: str | None, content: bytes) -> dict:

    # Validar extensión
    if not filename or not filename.lower().endswith(".pdf"):
        raise InvalidDocumentError("Solo se permiten archivos PDF")

    # Validar tamaño
    if len(content) > MAX_FILE_SIZE:
        raise DocumentTooLargeError("El archivo supera el límite de 5 MB")

    # Validar firma inicial
    if not content.startswith(b"%PDF-"):
        raise InvalidDocumentError("El archivo no es un PDF válido")

    return {
        "filename": filename,
        "size_bytes": len(content)
    }


# Extraer texto conservando el número de página
def extract_pdf_pages(content: bytes) -> list[ExtractedPage]:
    try:
        # Leer PDF desde memoria
        reader = PdfReader(BytesIO(content))

        # Rechazar documentos cifrados
        if reader.is_encrypted:
            raise InvalidDocumentError(
                "No se permiten PDFs protegidos con contraseña"
            )

        pages = []

        for page_number, page in enumerate(reader.pages, start=1):

            text = (page.extract_text() or "").strip()

            if text:
                pages.append(
                    ExtractedPage(
                        page_number=page_number,
                        text=text
                    )
                )

    except (PdfReadError, ValueError, OSError) as exc:
        raise InvalidDocumentError(
            "No se pudo leer el archivo PDF"
        ) from exc

    # Verificar que se haya extraído texto
    if not pages:
        raise InvalidDocumentError(
            "El PDF no contiene texto extraíble"
        )

    return pages

# Mantener compatibilidad con la extracción anterior
def extract_pdf_text(content: bytes) -> str:

    pages = extract_pdf_pages(content)

    return "\n".join(page.text for page in pages)