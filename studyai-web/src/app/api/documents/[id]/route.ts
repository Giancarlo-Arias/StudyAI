import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Reenvía las peticiones GET y DELETE a FastAPI.
 * El JWT permanece en el servidor.
 */
async function proxyDocumentRequest(
  method: "GET" | "DELETE",
  id: string,
  searchParams?: URLSearchParams,
): Promise<Response> {
  // 1. Obtener el token de la sesión.
  const cookieStore = await cookies();
  const token = cookieStore.get("studyai_session")?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "No tienes una sesión activa." },
      { status: 401 },
    );
  }

  // 2. Obtener la URL del backend.
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json(
      { detail: "API_BASE_URL no está configurada." },
      { status: 500 },
    );
  }

  // 3. Construir la URL del documento.
  const query =
    method === "GET" && searchParams
      ? searchParams.toString()
      : "";

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/documents/${encodeURIComponent(id)}`;

  const url = query ? `${endpoint}?${query}` : endpoint;

  try {
    // 4. Consultar FastAPI con el JWT.
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    // 5. Respetar las respuestas sin contenido.
    if (response.status === 204) {
      return new Response(null, {
        status: 204,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    // 6. Conservar los datos y el estado HTTP de FastAPI.
    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ??
          "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        detail: "No se pudo conectar con el servidor FastAPI.",
      },
      { status: 502 },
    );
  }
}

/**
 * GET /api/documents/[id]?limit=8&offset=0
 * Consulta un documento y sus fragmentos.
 */
export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { id } = await params;

  const searchParams = new URL(request.url).searchParams;

  return proxyDocumentRequest("GET", id, searchParams);
}

/**
 * DELETE /api/documents/[id]
 * Elimina un documento del usuario autenticado.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { id } = await params;

  return proxyDocumentRequest("DELETE", id);
}