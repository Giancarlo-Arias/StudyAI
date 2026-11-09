import { NextRequest, NextResponse } from "next/server";
import { ApiError, apiFetch } from "@/lib/api";
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
    const status = error instanceof ApiError ? error.status : 0;

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

export async function PATCH(request: NextRequest) {
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
    !("full_name" in body) ||
    typeof body.full_name !== "string"
  ) {
    return NextResponse.json(
      { error: "Debes proporcionar un nombre válido" },
      { status: 422 },
    );
  }

  const fullName = body.full_name.trim().replace(/\s+/g, " ");

  if (fullName.length < 2 || fullName.length > 150) {
    return NextResponse.json(
      { error: "El nombre debe tener entre 2 y 150 caracteres" },
      { status: 422 },
    );
  }

  try {
    const user = await apiFetch<CurrentUser>("auth/me", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: fullName,
      }),
    });

    return NextResponse.json(user, {
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

    if (status === 422) {
      return NextResponse.json(
        { error: "El nombre debe tener entre 2 y 150 caracteres" },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: "No se pudo actualizar el perfil" },
      { status: status === 503 ? 503 : 502 },
    );
  }
}