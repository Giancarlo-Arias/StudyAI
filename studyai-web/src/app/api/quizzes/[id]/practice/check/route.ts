import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PracticeCheckRequest = {
  question_id: string;
  selected_option: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;


// Validar los datos recibidos desde el formulario.
function isValidPracticeCheck(
  value: unknown,
): value is PracticeCheckRequest {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    Object.keys(data).length === 2 &&
    typeof data.question_id === "string" &&
    UUID_PATTERN.test(data.question_id) &&
    typeof data.selected_option === "number" &&
    Number.isInteger(data.selected_option) &&
    data.selected_option >= 0 &&
    data.selected_option <= 3
  );
}


// Comprobar una respuesta sin crear un intento.
export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  // Proteger las solicitudes de otros orígenes.
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { detail: "Origen de solicitud no permitido." },
      { status: 403 },
    );
  }

  // Validar el tipo de contenido.
  if (
    !request.headers
      .get("content-type")
      ?.includes("application/json")
  ) {
    return NextResponse.json(
      { detail: "El contenido debe ser JSON." },
      { status: 415 },
    );
  }

  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { detail: "Identificador de cuestionario no válido." },
      { status: 400 },
    );
  }

  // Obtener el token JWT desde la cookie HttpOnly.
  const cookieStore = await cookies();
  const token = cookieStore.get("studyai_session")?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Debes iniciar sesión." },
      { status: 401 },
    );
  }

  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json(
      { detail: "API_BASE_URL no está configurada." },
      { status: 500 },
    );
  }

  let payload: unknown;

  try {
    const rawBody = await request.text();

    if (rawBody.length > 8192) {
      return NextResponse.json(
        { detail: "La solicitud es demasiado grande." },
        { status: 413 },
      );
    }

    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { detail: "El JSON no es válido." },
      { status: 400 },
    );
  }

  if (!isValidPracticeCheck(payload)) {
    return NextResponse.json(
      { detail: "La respuesta no tiene un formato válido." },
      { status: 422 },
    );
  }

  // Consumir el endpoint de práctica en FastAPI.
  const endpoint =
    `${baseUrl.replace(/\/+$/, "")}` +
    `/quizzes/${encodeURIComponent(id)}/practice/check`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (response.status === 204) {
      return new Response(null, {
        status: 204,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const body = await response.text();

    // Conservar el estado y la respuesta de FastAPI.
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
      { detail: "No se pudo conectar con FastAPI." },
      { status: 502 },
    );
  }
}