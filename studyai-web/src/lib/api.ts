import "server-only";

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = process.env.API_BASE_URL;

  if (!baseUrl) {
    throw new Error("API_BASE_URL no está configurada");
  }

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`,
    {
      ...options,
      headers,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Error en la API: HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}