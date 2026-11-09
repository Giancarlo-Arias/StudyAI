import type { DocumentsResponse, UploadDocumentResponse } from "@/types/documents";
import { redirectExpiredSession } from "@/lib/session-client";

async function checkResponse(response: Response, signal?: AbortSignal): Promise<void> {
  if (response.ok) return;

  if (response.status === 401 && !signal?.aborted) {
    await redirectExpiredSession();
  }

  const data: unknown = await response.json().catch(() => null);
  let message = "Ocurrió un error al procesar la solicitud.";

  if (data && typeof data === "object") {
    if ("detail" in data && typeof data.detail === "string") {
      message = data.detail;
    } else if ("error" in data && typeof data.error === "string") {
      message = data.error;
    }
  }

  throw new Error(message);
}

export async function getDocuments(
  offset = 0,
  limit = 11,
  signal?: AbortSignal,
): Promise<DocumentsResponse> {
  const response = await fetch(`/api/documents?limit=${limit}&offset=${offset}`, {
    method: "GET",
    cache: "no-store",
    signal,
  });

  await checkResponse(response, signal);
  return response.json() as Promise<DocumentsResponse>;
}

export async function uploadDocument(file: File): Promise<UploadDocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/documents", {
    method: "POST",
    body: formData,
  });

  await checkResponse(response);
  return response.json() as Promise<UploadDocumentResponse>;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch("/api/documents", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: documentId }),
  });

  await checkResponse(response);
}
