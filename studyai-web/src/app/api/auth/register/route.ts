import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

type RegisteredUser = {
  id: number;
  email: string;
  email_verified_at: string | null;
};

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Datos de registro inválidos" },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;

  // Validar y normalizar los datos recibidos.
  const fullName =
    typeof data.full_name === "string"
      ? data.full_name.trim().replace(/\s+/g, " ")
      : "";

  const email =
    typeof data.email === "string"
      ? data.email.trim().toLowerCase()
      : "";

  const password =
    typeof data.password === "string"
      ? data.password
      : "";

  if (!fullName || !email || !password) {
    return NextResponse.json(
      { error: "Todos los campos son obligatorios" },
      { status: 400 },
    );
  }

  if (
    fullName.length < 2 ||
    fullName.length > 150 ||
    password.length < 12 ||
    password.length > 128
  ) {
    return NextResponse.json(
      { error: "Los datos no cumplen los requisitos de registro" },
      { status: 422 },
    );
  }

  try {
    // Enviar los datos a FastAPI sin generar una sesión.
    const user = await apiFetch<RegisteredUser>("auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
      }),
    });

    if (
      typeof user.id !== "number" ||
      typeof user.email !== "string"
    ) {
      throw new Error("FastAPI devolvió una respuesta inválida");
    }

    // No devolver contraseñas, hashes ni códigos.
    return NextResponse.json(
      {
        success: true,
        email: user.email,
        verificationRequired: user.email_verified_at === null,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const status =
      error instanceof Error
        ? Number(error.message.match(/HTTP (\d{3})/)?.[1])
        : 0;

    if (status === 409) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo" },
        { status: 409 },
      );
    }

    if (status === 422) {
      return NextResponse.json(
        { error: "Revisa los datos del formulario" },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: "No se pudo completar el registro" },
      { status: 502 },
    );
  }
}