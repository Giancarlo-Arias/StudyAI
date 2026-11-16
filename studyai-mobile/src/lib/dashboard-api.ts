import { expireSession } from "@/lib/session-events";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "studyai_access_token";

export type RecentAttempt = {
  attempt_id: number;
  quiz_id: number;
  quiz_title: string;
  question_count: number;
  correct_count: number;
  score_percent: number;
  submitted_at: string;
};

export type DashboardData = {
  progress: {
    total_quizzes: number;
    quizzes_completed: number;
    total_attempts: number;
    average_score_percent: number | null;
    best_score_percent: number | null;
    recent_attempts: RecentAttempt[];
  };
  documents: {
    document_id: number;
    filename: string;
    total_quizzes: number;
    quizzes_completed: number;
    total_attempts: number;
    average_score_percent: number | null;
    best_score_percent: number | null;
    last_attempt_at: string | null;
  }[];
  achievements: unknown[];
};

export type StudyDocument = {
  id: number;
  filename: string;
  size_bytes: number;
  pages_with_text: number;
  text_length: number;
  created_at: string;
};

export type DocumentsResponse = {
  documents: StudyDocument[];
  count: number;
  limit: number;
  offset: number;
};

function getEndpoint(path: string): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(
    /\/+$/,
    "",
  );

  if (!configured) {
    throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");
  }

  const base = configured.endsWith("/api/v1")
    ? configured
    : `${configured}/api/v1`;

  return `${base}/${path.replace(/^\/+/, "")}`;
}

async function authenticatedGet<T>(path: string): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (!token) {
    throw expireSession();
  }

  const response = await fetch(getEndpoint(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw expireSession();
    }

    throw new Error(
      `No se pudieron cargar los datos (${response.status}).`,
    );
  }

  return (await response.json()) as T;
}

export function getDashboardData(): Promise<DashboardData> {
  return authenticatedGet<DashboardData>("dashboard");
}

export function getStudyDocuments(
  limit = 20,
  offset = 0,
): Promise<DocumentsResponse> {
  return authenticatedGet<DocumentsResponse>(
    `documents?limit=${limit}&offset=${offset}`,
  );
}
