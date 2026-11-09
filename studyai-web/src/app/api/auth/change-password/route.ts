import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/api";

type PasswordChangeResponse = {
  message: string;
};

export async function POST(request: NextRequest) {
  const token = request.cookies.get("studyai_session")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }

  const body: unknown = await request.json().catch(() => null);

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    !("current_password" in body) ||
    typeof body.current_password !== "string" ||
    !("new_password" in body) ||
    typeof body.new_password !== "string"
  ) {
    return NextResponse.json(
      { error: "Debes proporcionar ambas contraseñas" },
      { status: 422 },
    );
  }

  const { current_password, new_password } = body;

  if (
    current_password.length < 1 ||
    current_password.length > 128 ||
    new_password.length < 12 ||
    new_password.length > 128
  ) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener entre 12 y 128 caracteres" },
      { status: 422 },
    );
  }

  try {
    const result = await apiFetch<PasswordChangeResponse>(
      "auth/change-password",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password,
          new_password,
        }),
      },
    );

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;

    if (status === 401) {
      const response = NextResponse.json(
        { error: "Sesión inválida o expirada" },
        { status: 401 },
      );

      response.cookies.delete("studyai_session");
      return response;
    }

    if (status === 400) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 },
      );
    }

    if (status === 409) {
      return NextResponse.json(
        {
          error:
            "No se pudo cambiar la contraseña. Debe ser diferente de la actual. Intenta nuevamente.",
        },
        { status: 409 },
      );
    }

    if (status === 422) {
      return NextResponse.json(
        { error: "Los datos de la contraseña no son válidos" },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña" },
      { status: status === 503 ? 503 : 502 },
    );
  }
}