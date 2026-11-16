import { expireSession } from "@/lib/session-events";
import * as SecureStore from "expo-secure-store";
import { Directory, File, Paths, UploadType } from "expo-file-system";
import type { DocumentPickerAsset } from "expo-document-picker";

import type { DocumentsResponse } from "@/lib/dashboard-api";

const TOKEN_KEY = "studyai_access_token";

export const MAX_PDF_SIZE = 5 * 1024 * 1024;

let uploadInProgress = false;

type StudyDocument = DocumentsResponse["documents"][number];

export type DocumentChunk = {
  id: number | string;
  page_number: number | null;
  chunk_index: number;
  text: string;
};

export type DocumentDetailResponse = {
  document: StudyDocument;
  chunks: DocumentChunk[];
  chunk_count: number;
  limit: number;
  offset: number;
};

export type UploadDocumentResponse = {
  message: string;
  document_id: number | string;
  filename: string;
  size_bytes: number;
  pages_with_text: number;
  text_length: number;
  chunk_count: number;
  embedding_status?: string;
};

export type UploadProgressInfo = {
  fraction: number;
  bytesSent: number;
  totalBytes: number;
};

function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (!configured) {
    throw new Error(
      "Falta configurar EXPO_PUBLIC_API_URL.",
    );
  }

  return configured.endsWith("/api/v1")
    ? configured
    : `${configured}/api/v1`;
}

async function getToken(): Promise<string> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (!token) {
    throw expireSession();
  }

  return token;
}

function parseJson(content: string): unknown {
  if (!content.trim()) return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getErrorMessage(
  payload: unknown,
  fallback: string,
): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const body = payload as Record<string, unknown>;
  const detail = body.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (
        item && typeof item === "object" && "msg" in item
      ) {
        return String(item.msg);
      }

      return null;
    })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(". ");
    }
  }

  if (typeof body.message === "string") {
    return body.message;
  }

  return fallback;
}

function assertSuccess(
  status: number,
  payload: unknown,
  fallback: string,
): void {
  if (status >= 200 && status < 300) return;

  if (status === 401) {
    throw expireSession();
  }

  throw new Error(getErrorMessage(payload, fallback));
}

export function validatePdfAsset(
  asset: DocumentPickerAsset,
): void {
  if (!asset.name.toLowerCase().endsWith(".pdf")) {
    throw new Error(
      "Selecciona un documento en formato PDF.",
    );
  }

  if (
    typeof asset.size === "number" && asset.size > MAX_PDF_SIZE
  ) {
    throw new Error(
      "El PDF supera el tamaño máximo de 5 MB.",
    );
  }

  if (
    typeof asset.size === "number" && asset.size === 0
  ) {
    throw new Error(
      "El archivo seleccionado está vacío.",
    );
  }
}

// Conserva el nombre seleccionado, evitando rutas
// que puedan venir incluidas en el nombre.
function getOriginalFilename(
  asset: DocumentPickerAsset,
): string {
  const filename = asset.name.split(/[\\/]/).pop()?.trim();

  if (!filename || !filename.toLowerCase().endsWith(".pdf")) {
    throw new Error("El nombre del PDF no es válido.");
  }

  return filename;
}

export async function uploadStudyPdf(
  asset: DocumentPickerAsset,
  onProgress?: (info: UploadProgressInfo) => void,
): Promise<UploadDocumentResponse> {
  validatePdfAsset(asset);

  if (uploadInProgress) {
    throw new Error(
      "Ya hay un PDF subiendo. Espera a que termine.",
    );
  }

  uploadInProgress = true;

  let temporaryDirectory: Directory | null = null;

  try {
    const token = await getToken();
    const originalFilename = getOriginalFilename(asset);
    const source = new File(asset.uri);

    if (!source.exists) {
      throw new Error(
        "No se pudo acceder al archivo seleccionado.",
      );
    }

    const fileSize = Number(source.size);

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      throw new Error("El archivo está vacío o no es válido.");
    }

    if (fileSize > MAX_PDF_SIZE) {
      throw new Error(
        "El PDF supera el tamaño máximo de 5 MB.",
      );
    }

    // Una carpeta exclusiva por subida evita colisiones.
    temporaryDirectory = new Directory(
      Paths.cache,
      `studyai-upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    );

    temporaryDirectory.create();

    // La copia tendrá el nombre original del PDF.
    const uploadFile = new File(
      temporaryDirectory,
      originalFilename,
    );

    await source.copy(uploadFile);

    const task = uploadFile.createUploadTask(
      `${getApiBaseUrl()}/documents/upload`,
      {
        httpMethod: "POST",
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        mimeType: "application/pdf",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        onProgress: ({ bytesSent, totalBytes }) => {
          const sent = Number(bytesSent);
          const total = Number(totalBytes);

          if (
            !Number.isFinite(sent) || !Number.isFinite(total) || total <= 0
          ) {
            return;
          }

          const fraction = Math.min(
            1,
            Math.max(0, sent / total),
          );

          try {
            onProgress?.({ bytesSent: sent, totalBytes: total, fraction });
          } catch (error) {
            if (__DEV__) {
              console.warn(
                "No se pudo actualizar el progreso:",
                error,
              );
            }
          }
        },
      },
    );

    try {
      const response = await task.uploadAsync();
      const payload = parseJson(response.body);

      assertSuccess(
        response.status,
        payload,
        "No se pudo subir el documento.",
      );

      if (
        !payload || typeof payload !== "object" || !("document_id" in payload) || !payload.document_id
      ) {
        throw new Error(
          "FastAPI no devolvió el identificador del documento. Revisa la biblioteca antes de repetir la subida.",
        );
      }

      return payload as UploadDocumentResponse;
    } finally {
      task.release();
    }
  } finally {
    // Eliminamos únicamente nuestra copia temporal.
    try {
      if (temporaryDirectory?.exists) {
        temporaryDirectory.delete();
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(
          "No se pudo limpiar el archivo temporal:",
          error,
        );
      }
    }

    uploadInProgress = false;
  }
}

export async function getStudyDocumentDetail(
  documentId: string,
  limit = 8,
  offset = 0,
): Promise<DocumentDetailResponse> {
  const token = await getToken();

  const url =
    `${getApiBaseUrl()}/documents/` +
    `${encodeURIComponent(documentId)}` +
    `?limit=${limit}&offset=${offset}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const payload = parseJson(await response.text());

  assertSuccess(
    response.status,
    payload,
    "No se pudo cargar el documento.",
  );

  return payload as DocumentDetailResponse;
}

export async function deleteStudyDocument(
  documentId: string,
): Promise<void> {
  const token = await getToken();

  const response = await fetch(
    `${getApiBaseUrl()}/documents/${encodeURIComponent(documentId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (response.ok) return;

  const payload = parseJson(await response.text());

  assertSuccess(
    response.status,
    payload,
    "No se pudo eliminar el documento.",
  );
}

export function formatDocumentSize(
  bytes: number,
): string {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
