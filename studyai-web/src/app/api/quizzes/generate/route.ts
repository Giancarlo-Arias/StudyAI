import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type QuizDifficulty = "facil" | "intermedia" | "dificil";

type GenerateQuizRequest = {
  document_id: string;
  title: string;
  question_count: number;
  difficulty: QuizDifficulty;
};

function isGenerateQuizRequest(
  value: unknown,
): value is GenerateQuizRequest {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.document_id === "string" &&
    /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
      data.document_id,
    ) &&
    typeof data.title === "string" &&
    data.title.trim().length > 0 &&
    Number.isInteger(data.question_count) &&
    (data.question_count as number) >= 1 &&
    (data.question_count as number) <= 20 &&
    (
      data.difficulty === "facil" ||
      data.difficulty === "intermedia" ||
      data.difficulty === "dificil"
    )
  );
}

export async function POST(request: Request): Promise<Response> {
  // 1. Comprobar que la solicitud provenga del mismo origen.
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { detail: "Origen de solicitud no permitido." },
      { status: 403 },
    );
  }

  // 2. Obtener la sesión del usuario.
  const cookieStore = await cookies();
  const token = cookieStore.get("studyai_session")?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Debes iniciar sesión para generar cuestionarios." },
      { status: 401 },
    );
  }

  // 3. Validar el cuerpo de la solicitud.
  let payload: unknown;

  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json(
        { detail: "El contenido debe ser JSON." },
        { status: 415 },
      );
    }

    const rawBody = await request.text();

    if (rawBody.length > 4096) {
      return NextResponse.json(
        { detail: "La solicitud supera el tamaño permitido." },
        { status: 413 },
      );
    }

    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { detail: "El contenido JSON no es válido." },
      { status: 400 },
    );
  }

  if (!isGenerateQuizRequest(payload)) {
    return NextResponse.json(
      {
        detail:
          "Proporciona un documento válido, un título, entre 1 y 20 preguntas y una dificultad válida.",
      },
      { status: 422 },
    );
  }

  // 4. Obtener la URL privada de FastAPI.
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json(
      { detail: "El servidor de la API no está configurado." },
      { status: 500 },
    );
  }

  const endpoint =
    `${baseUrl.replace(/\/+$/, "")}/quizzes/generate`;

  // 5. Generar el cuestionario mediante FastAPI.
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_id: payload.document_id,
        title: payload.title.trim(),
        question_count: payload.question_count,
        difficulty: payload.difficulty,
      }),
      cache: "no-store",
    });

    // 6. Devolver el estado y los datos originales de la API.
    if (response.status === 204) {
      return new Response(null, {
        status: 204,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

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
        detail: "No se pudo conectar con el servicio de cuestionarios.",
      },
      { status: 502 },
    );
  }
}