import { NextResponse } from "next/server";

import { ApiError, apiFetch } from "@/lib/api";

type PasswordResetMessage = {
  message: string;
};

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
    !("email" in body) ||
    typeof body.email !== "string"
  ) {
    return NextResponse.json(
      { error: "Debes introducir un correo electrónico válido." },
      { status: 400 },
    );
  }

  const email = body.email.trim();

  if (!email || email.length > 254) {
    return NextResponse.json(
      { error: "Debes introducir un correo electrónico válido." },
      { status: 400 },
    );
  }

  try {
    const result = await apiFetch<PasswordResetMessage>(
      "auth/forgot-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
    );

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 422) {
        return NextResponse.json(
          { error: "El correo electrónico no tiene un formato válido." },
          { status: 422 },
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          { error: "Demasiadas solicitudes. Intenta nuevamente más tarde." },
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
      { error: "No se pudo procesar la solicitud. Intenta nuevamente." },
      { status: 502 },
    );
  }
}