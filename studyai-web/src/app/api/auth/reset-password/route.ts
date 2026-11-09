import { NextResponse } from "next/server";

import { ApiError, apiFetch } from "@/lib/api";

type PasswordResetMessage = {
  message: string;
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "La solicitud no contiene un JSON válido." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("token" in body) ||
    !("new_password" in body) ||
    typeof body.token !== "string" ||
    typeof body.new_password !== "string"
  ) {
    return NextResponse.json(
      { error: "Debes proporcionar un token y una contraseña válida." },
      { status: 400 },
    );
  }

  const { token, new_password } = body;

  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json(
      { error: "El enlace de recuperación no es válido." },
      { status: 400 },
    );
  }

  if (new_password.length < 12 || new_password.length > 128) {
    return NextResponse.json(
      { error: "La contraseña debe tener entre 12 y 128 caracteres." },
      { status: 422 },
    );
  }

  try {
    const result = await apiFetch<PasswordResetMessage>(
      "auth/reset-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          new_password,
        }),
      },
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        return NextResponse.json(
          { error: "El enlace es inválido, venció o ya fue utilizado." },
          { status: 400 },
        );
      }

      if (error.status === 422) {
        return NextResponse.json(
          { error: "Los datos proporcionados no son válidos." },
          { status: 422 },
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          { error: "Demasiados intentos. Intenta nuevamente más tarde." },
          { status: 429 },
        );
      }

      if (error.status === 503) {
        return NextResponse.json(
          { error: "El servicio no está disponible temporalmente." },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      { error: "No se pudo restablecer la contraseña." },
      { status: 502 },
    );
  }
}