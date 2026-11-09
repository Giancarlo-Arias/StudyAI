import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
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

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/quizzes`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (response.status === 204) {
      return new Response(null, { status: 204 });
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
        detail: "No se pudo conectar con FastAPI.",
      },
      { status: 502 },
    );
  }
}