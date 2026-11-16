import { expireSession } from "@/lib/session-events";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "studyai_access_token";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

export type Achievement = {
  code: string;
  title: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
  unlocked_at: string | null;
};

function isAchievement(value: unknown): value is Achievement {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.code === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string" &&
    typeof item.current === "number" &&
    Number.isFinite(item.current) &&
    typeof item.target === "number" &&
    Number.isFinite(item.target) &&
    typeof item.unlocked === "boolean" &&
    (item.unlocked_at === null || typeof item.unlocked_at === "string")
  );
}

export async function getStudyAchievements(): Promise<Achievement[]> {
  if (!API_URL) {
    throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");
  }

  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (!token) {
    throw expireSession();
  }

  const baseUrl = API_URL.endsWith("/api/v1")
    ? API_URL
    : `${API_URL}/api/v1`;

  const response = await fetch(`${baseUrl}/achievements`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      throw expireSession();
    }

    throw new Error("No se pudieron consultar tus logros.");
  }

  if (
    !data ||
    typeof data !== "object" ||
    !("achievements" in data) ||
    !Array.isArray(data.achievements) ||
    !data.achievements.every(isAchievement)
  ) {
    throw new Error("FastAPI devolvió un formato de logros inesperado.");
  }

  return data.achievements;
}