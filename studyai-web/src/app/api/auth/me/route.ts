import { NextRequest, NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import type { CurrentUser } from "@/types/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("studyai_session")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "No hay una sesión activa" },
      { status: 401 },
    );
  }

  try {
    const user = await apiFetch<CurrentUser>("auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return NextResponse.json(user, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const status =
      error instanceof Error
        ? Number(error.message.match(/HTTP (\d{3})/)?.[1])
        : 0;

    if (status === 401) {
      const response = NextResponse.json(
        { error: "Sesión inválida o expirada" },
        { status: 401 },
      );

      response.cookies.delete("studyai_session");

      return response;
    }

    return NextResponse.json(
      { error: "No se pudo obtener el usuario autenticado" },
      { status: status === 503 ? 503 : 502 },
    );
  }
}