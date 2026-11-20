import { expireSession } from "@/lib/session-events";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "studyai_access_token";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

export type DocumentProgress = {
  document_id: string;
  filename: string;
  total_quizzes: number;
  quizzes_completed: number;
  total_attempts: number;
  average_score_percent: number | null;
  best_score_percent: number | null;
  last_attempt_at: string | null;
};

export type TopicProgress = {
  document_id: string;
  filename: string;
  topic: string;
  questions_evaluated: number;
  correct_questions: number;
  incorrect_questions: number;
  accuracy_percent: number;
  status: "insufficient_data" | "reinforce" | "review" | "strong";
};

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isDocumentProgress(value: unknown): value is DocumentProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.document_id === "string" &&
    typeof item.filename === "string" &&
    Number.isInteger(item.total_quizzes) &&
    Number.isInteger(item.quizzes_completed) &&
    Number.isInteger(item.total_attempts) &&
    isNullableNumber(item.average_score_percent) &&
    isNullableNumber(item.best_score_percent) &&
    (item.last_attempt_at === null || typeof item.last_attempt_at === "string")
  );
}

function isTopicProgress(value: unknown): value is TopicProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.document_id === "string" &&
    typeof item.filename === "string" &&
    typeof item.topic === "string" &&
    Number.isInteger(item.questions_evaluated) &&
    Number.isInteger(item.correct_questions) &&
    Number.isInteger(item.incorrect_questions) &&
    typeof item.accuracy_percent === "number" &&
    Number.isFinite(item.accuracy_percent) &&
    (
      item.status === "insufficient_data" ||
      item.status === "reinforce" ||
      item.status === "review" ||
      item.status === "strong"
    )
  );
}

export async function getDocumentProgress(): Promise<DocumentProgress[]> {
  if (!API_URL) throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw expireSession();

  const baseUrl = API_URL.endsWith("/api/v1") ? API_URL : `${API_URL}/api/v1`;

  const response = await fetch(`${baseUrl}/progress/documents`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) throw expireSession();
    throw new Error(`No se pudo cargar el progreso (HTTP ${response.status}).`);
  }

  const documents = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "documents" in data
      ? data.documents
      : null;

  if (!Array.isArray(documents) || !documents.every(isDocumentProgress)) {
    throw new Error("FastAPI devolvió un formato de progreso inesperado.");
  }

  return documents;
}

export async function getTopicProgress(): Promise<TopicProgress[]> {
  if (!API_URL) throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw expireSession();

  const baseUrl = API_URL.endsWith("/api/v1") ? API_URL : `${API_URL}/api/v1`;

  const response = await fetch(`${baseUrl}/progress/topics`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) throw expireSession();
    throw new Error(`No se pudieron cargar los temas (HTTP ${response.status}).`);
  }

  const topics = data && typeof data === "object" && "topics" in data
    ? data.topics
    : null;

  if (!Array.isArray(topics) || !topics.every(isTopicProgress)) {
    throw new Error("FastAPI devolvió un formato de temas inesperado.");
  }

  return topics;
}