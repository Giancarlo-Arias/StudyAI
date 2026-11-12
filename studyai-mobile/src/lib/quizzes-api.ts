import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "studyai_access_token";

export type QuizDifficulty = "facil" | "intermedia" | "dificil";

export type GenerateQuizInput = {
  documentId: string;
  title: string;
  difficulty: QuizDifficulty;
  questionCount: number;
};

export type GeneratedQuiz = {
  id: string | null;
  title: string;
};

let generationInProgress = false;

function getApiBaseUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (!value) {
    throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");
  }

  return value.endsWith("/api/v1")
    ? value
    : `${value}/api/v1`;
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.detail === "string") {
    return body.detail;
  }

  if (Array.isArray(body.detail)) {
    const messages = body.detail.map((item) => {
      if (
        item && typeof item === "object" && "msg" in item
      ) {
        return String(item.msg);
      }

      return null;
    })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(". ");
    }
  }

  if (typeof body.message === "string") {
    return body.message;
  }

  return null;
}

function getGeneratedQuizId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const body = payload as Record<string, unknown>;

  if (typeof body.id === "string") {
    return body.id;
  }

  if (typeof body.quiz_id === "string") {
    return body.quiz_id;
  }

  if (
    body.quiz && typeof body.quiz === "object" && "id" in body.quiz && typeof body.quiz.id === "string"
  ) {
    return body.quiz.id;
  }

  return null;
}

export async function generateStudyQuiz(
  input: GenerateQuizInput,
): Promise<GeneratedQuiz> {
  if (generationInProgress) {
    throw new Error(
      "Ya se está generando un cuestionario.",
    );
  }

  const title = input.title.trim();

  if (!input.documentId.trim()) {
    throw new Error("No se seleccionó un documento válido.");
  }

  if (!title) {
    throw new Error("El cuestionario necesita un título.");
  }

  if (
    !Number.isInteger(input.questionCount) || input.questionCount < 1 || input.questionCount > 20
  ) {
    throw new Error(
      "La cantidad debe estar entre 1 y 20 preguntas.",
    );
  }

  if (
    !["facil", "intermedia", "dificil"].includes(
      input.difficulty,
    )
  ) {
    throw new Error("Selecciona una dificultad válida.");
  }

  generationInProgress = true;

  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    if (!token) {
      throw new Error(
        "Tu sesión no está disponible. Inicia sesión nuevamente.",
      );
    }

    const response = await fetch(
      `${getApiBaseUrl()}/quizzes/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ document_id: input.documentId, title, question_count: input.questionCount, difficulty: input.difficulty }),
      },
    );

    const raw = await response.text();

    let payload: unknown = null;

    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }

    if (response.status === 401) {
      throw new Error(
        "Tu sesión expiró. Inicia sesión nuevamente.",
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(payload) ?? "No se pudo generar el cuestionario.",
      );
    }

    return { id: getGeneratedQuizId(payload), title };
  } finally {
    generationInProgress = false;
  }
}
