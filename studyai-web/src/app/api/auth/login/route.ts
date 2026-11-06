import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import type { AccessTokenResponse, UserLogin } from "@/types/auth";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    !body.email.trim() ||
    !body.password
  ) {
    return NextResponse.json(
      { error: "Correo y contraseña son obligatorios" },
      { status: 400 },
    );
  }

  const credentials: UserLogin = {
    email: body.email.trim(),
    password: body.password,
  };

  try {
    const data = await apiFetch<AccessTokenResponse>("auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!data.access_token) {
      throw new Error("FastAPI no devolvió un token válido");
    }

    const response = NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );

    response.cookies.set({
      name: "studyai_session",
      value: data.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    const status =
      error instanceof Error
        ? Number(error.message.match(/HTTP (\d{3})/)?.[1])
        : 0;

    if (status >= 400 && status < 500) {
      return NextResponse.json(
        { error: "No se pudo iniciar sesión" },
        { status },
      );
    }

    return NextResponse.json(
      { error: "No se pudo conectar con el servicio de autenticación" },
      { status: 502 },
    );
  }
}