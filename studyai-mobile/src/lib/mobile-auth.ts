import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "studyai_access_token";

export type CurrentUser = {
  id: number;
  full_name: string;
  email: string;
};

function getApiUrl(path: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!baseUrl) {
    throw new Error(
      "Configura EXPO_PUBLIC_API_URL para conectar StudyAI con FastAPI.",
    );
  }

  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

// Iniciar sesión con el backend existente.
export async function signIn(
  email: string,
  password: string,
): Promise<void> {
  const response = await fetch(getApiUrl("auth/login"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 400) {
      throw new Error("Correo o contraseña incorrectos.");
    }

    if (response.status === 403) {
      throw new Error(
        "Tu cuenta requiere verificación antes de iniciar sesión.",
      );
    }

    throw new Error("No fue posible iniciar sesión.");
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" || data === null || !("access_token" in data) || typeof data.access_token !== "string" ||
    !data.access_token
  ) {
    throw new Error("FastAPI no devolvió un token válido.");
  }

  await SecureStore.setItemAsync(
    TOKEN_KEY,
    data.access_token,
  );
}

// Consultar el usuario de la sesión actual.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (!token) {
    return null;
  }

  const response = await fetch(getApiUrl("auth/me"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return null;
  }

  if (!response.ok) {
    throw new Error("No se pudo consultar tu sesión.");
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" || data === null || !("id" in data) || typeof data.id !== "number" ||
    !("full_name" in data) ||
    typeof data.full_name !== "string" ||
    !("email" in data) ||
    typeof data.email !== "string"
  ) {
    throw new Error("FastAPI devolvió un usuario no válido.");
  }

  return { id: data.id, full_name: data.full_name, email: data.email };
}

// Cerrar sesión en el dispositivo.
export async function signOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
