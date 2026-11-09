import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type QuizAnswer = {
  question_id: string;
  selected_option: number;
};

function isValidSubmission(
  value: unknown,
): value is { answers: QuizAnswer[] } {
  if (
    typeof value !== "object" ||
    value === null ||
    !("answers" in value) ||
    !Array.isArray(value.answers) ||
    value.answers.length < 1 ||
    value.answers.length > 20
  ) {
    return false;
  }

  const questionIds = new Set<string>();

  for (const answer of value.answers) {
    if (
      typeof answer !== "object" ||
      answer === null ||
      typeof answer.question_id !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(
        answer.question_id,
      ) ||
      !Number.isInteger(answer.selected_option) ||
      answer.selected_option < 0 ||
      answer.selected_option > 3 ||
      questionIds.has(answer.question_id)
    ) {
      return false;
    }

    questionIds.add(answer.question_id);
  }

  return true;
}

async function proxyQuizRequest(
  method: "GET" | "POST",
  id: string,
  payload?: { answers: QuizAnswer[] },
): Promise<Response> {
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

  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json(
      { detail: "Identificador de cuestionario no válido." },
      { status: 400 },
    );
  }

  const endpoint = `${baseUrl.replace(/\/+$/, "")}/quizzes/${encodeURIComponent(id)}${method === "POST" ? "/submit" : ""}`;

  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(method === "POST"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      ...(method === "POST"
        ? { body: JSON.stringify(payload) }
        : {}),
      cache: "no-store",
    });

    if (response.status === 204) {
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
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
      { detail: "No se pudo conectar con FastAPI." },
      { status: 502 },
    );
  }
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { id } = await params;

  return proxyQuizRequest("GET", id);
}

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { detail: "Origen de solicitud no permitido." },
      { status: 403 },
    );
  }

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

  if (!isValidSubmission(payload)) {
    return NextResponse.json(
      { detail: "Las respuestas no tienen un formato válido." },
      { status: 422 },
    );
  }

  const { id } = await params;

  return proxyQuizRequest("POST", id, payload);
}