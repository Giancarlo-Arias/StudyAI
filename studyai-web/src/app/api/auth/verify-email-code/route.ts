import { NextResponse } from "next/server";

import { ApiError, apiFetch } from "@/lib/api";

type VerificationResponse = {
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
      { error: "Datos de verificación inválidos" },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  const email =
    typeof data.email === "string"
      ? data.email.trim().toLowerCase()
      : "";

  const code =
    typeof data.code === "string"
      ? data.code
      : "";

  if (!email || !/^[0-9]{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Ingresa un correo y un código válido de 6 dígitos" },
      { status: 400 },
    );
  }

  try {
    const result = await apiFetch<VerificationResponse>(
      "auth/verify-email-code",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
        }),
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
      if (error.status === 400) {
        return NextResponse.json(
          {
            error:
              "Código incorrecto, vencido o sin intentos disponibles",
          },
          { status: 400 },
        );
      }

      if (error.status === 422) {
        return NextResponse.json(
          { error: "Correo o código inválido" },
          { status: 422 },
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          {
            error: "Demasiados intentos. Intenta más tarde.",
          },
          { status: 429 },
        );
      }
    }

    return NextResponse.json(
      { error: "No se pudo completar la verificación" },
      { status: 503 },
    );
  }
}