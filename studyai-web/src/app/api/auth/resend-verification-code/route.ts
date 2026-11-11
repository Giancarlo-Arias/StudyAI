import { NextResponse } from "next/server";

import { ApiError, apiFetch } from "@/lib/api";

type ResendResponse = {
  message: string;
};

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Datos inválidos" },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const email =
    typeof data.email === "string"
      ? data.email.trim().toLowerCase()
      : "";

  if (!email) {
    return NextResponse.json(
      { error: "El correo electrónico es obligatorio" },
      { status: 400 },
    );
  }

  try {
    const result = await apiFetch<ResendResponse>(
      "auth/resend-verification-code",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
    );

    return NextResponse.json(
      {
        success: true,
        message: result.message,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 422) {
        return NextResponse.json(
          { error: "Correo electrónico inválido" },
          { status: 422 },
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          {
            error: "Demasiadas solicitudes. Intenta más tarde.",
          },
          { status: 429 },
        );
      }
    }

    return NextResponse.json(
      { error: "No se pudo procesar el reenvío" },
      { status: 503 },
    );
  }
}