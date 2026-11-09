import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
    attemptId: string;
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const { id, attemptId } = await params;

  if (
    !UUID_PATTERN.test(id) ||
    !UUID_PATTERN.test(attemptId)
  ) {
    return NextResponse.json(
      { detail: "Identificador no válido." },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();

  const token = cookieStore.get(
    "studyai_session",
  )?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Tu sesión ha expirado." },
      { status: 401 },
    );
  }

  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json(
      {
        detail: "API_BASE_URL no está configurada.",
      },
      { status: 500 },
    );
  }

  const endpoint =
    `${baseUrl.replace(/\/+$/, "")}` +
    `/quizzes/${encodeURIComponent(id)}` +
    `/attempts/${encodeURIComponent(attemptId)}`;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
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
        detail:
          "No se pudo consultar la revisión del intento.",
      },
      { status: 502 },
    );
  }
}