import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

async function forwardToBackend(
  request: NextRequest,
  method: "GET" | "POST" | "DELETE",
  endpoint: string,
  body?: FormData,
): Promise<NextResponse> {
  const token = request.cookies.get("studyai_session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  }

  const baseUrl = process.env.API_BASE_URL?.replace(/\/+$/, "");

  if (!baseUrl) {
    return NextResponse.json(
      { error: "La API no está configurada." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data: unknown = await response.json().catch(() => ({
      error: "Respuesta inesperada del backend.",
    }));

    return NextResponse.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con FastAPI." },
      { status: 502 },
    );
  }
}

function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "11");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  if (!Number.isInteger(limit) || limit < 1 || limit > 100 ||
      !Number.isInteger(offset) || offset < 0) {
    return NextResponse.json(
      { error: "Parámetros de paginación inválidos." },
      { status: 400 },
    );
  }

  return forwardToBackend(
    request,
    "GET",
    `documents?limit=${limit}&offset=${offset}`,
  );
}

export async function POST(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formulario inválido." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecciona un archivo PDF." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Solo se permiten archivos PDF." }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo debe tener un tamaño mayor que 0 y máximo de 5 MB." },
      { status: 413 },
    );
  }

  const backendForm = new FormData();
  backendForm.append("file", file, file.name);

  return forwardToBackend(request, "POST", "documents/upload", backendForm);
}

export async function DELETE(request: NextRequest) {
  if (!isTrustedOrigin(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const data: unknown = await request.json().catch(() => null);

  if (!data || typeof data !== "object" || !("id" in data) ||
      typeof data.id !== "string" || !data.id.trim() || data.id.length > 100) {
    return NextResponse.json(
      { error: "Identificador de documento inválido." },
      { status: 400 },
    );
  }

  return forwardToBackend(
    request,
    "DELETE",
    `documents/${encodeURIComponent(data.id)}`,
  );
}