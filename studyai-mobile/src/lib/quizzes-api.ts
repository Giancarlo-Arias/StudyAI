import { expireSession } from "@/lib/session-events";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "studyai_access_token";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

export type QuizDifficulty = "facil" | "intermedia" | "dificil";
export type QuizMode = "practice" | "exam";

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

export type QuizSummary = {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  question_count: number;
};

export type QuizQuestion = {
  id: string;
  position: number;
  question_text: string;
  options: string[];
};

export type QuizDetail = {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  questions: QuizQuestion[];
};

export type QuizAnswer = {
  question_id: string;
  selected_option: number;
};

export type AnswerReview = {
  question_id: string;
  correct_option: number | null;
  is_correct: boolean | null;
  explanation: string | null;
};

export type QuizResult = {
  attemptId: string | null;
  scorePercent: number | null;
  correctCount: number | null;
  reviews: AnswerReview[];
};

export type PracticeCheckResult = {
  question_id: string;
  correct_option: number;
  is_correct: boolean;
  explanation: string;
};

export type QuizAttempt = {
  attempt_id: string;
  quiz_id: string;
  question_count: number;
  correct_count: number;
  score_percent: number;
  submitted_at: string;
};

export type ReviewedQuizAnswer = {
  question_id: string;
  selected_option: number;
  correct_option: number;
  is_correct: boolean;
  explanation: string;
  position: number;
  question_text: string;
  options: string[];
};

export type StudyAttemptReview = {
  attempt_id: string;
  quiz_id: string;
  question_count: number;
  correct_count: number;
  score_percent: number;
  submitted_at: string;
  answers: ReviewedQuizAnswer[];
};

let generationInProgress = false;

// Configuración de la API.
function getBaseUrl(): string {
  if (!API_URL) throw new Error("Falta configurar EXPO_PUBLIC_API_URL.");
  return API_URL.endsWith("/api/v1") ? API_URL : `${API_URL}/api/v1`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (!isRecord(value)) return fallback;

  if (typeof value.detail === "string") return value.detail;
  if (typeof value.message === "string") return value.message;

  if (Array.isArray(value.detail)) {
    const messages = value.detail
      .filter((item): item is { msg: string } =>
        isRecord(item) && typeof item.msg === "string"
      )
      .map((item) => item.msg);

    if (messages.length) return messages.join(". ");
  }

  return fallback;
}

async function request(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<unknown> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) throw expireSession();

  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const raw = await response.text();
  let data: unknown = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // La respuesta no contiene JSON válido.
  }

  if (response.status === 401) {
    throw expireSession();
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Error ${response.status} al consultar StudyAI.`));
  }

  return data;
}

// Validaciones de las respuestas de FastAPI.
function getQuizId(value: unknown): string | null {
  if (!isRecord(value)) return null;

  if (typeof value.id === "string") return value.id;
  if (typeof value.quiz_id === "string") return value.quiz_id;

  if (isRecord(value.quiz) && typeof value.quiz.id === "string") {
    return value.quiz.id;
  }

  return null;
}

function isQuizSummary(value: unknown): value is QuizSummary {
  if (!isRecord(value)) return false;

  return typeof value.id === "string"
    && typeof value.document_id === "string"
    && typeof value.title === "string"
    && typeof value.created_at === "string"
    && Number.isInteger(value.question_count)
    && Number(value.question_count) >= 0;
}

function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!isRecord(value)) return false;

  return typeof value.id === "string"
    && Number.isInteger(value.position)
    && typeof value.question_text === "string"
    && Array.isArray(value.options)
    && value.options.length === 4
    && value.options.every((option: unknown) => typeof option === "string");
}

function isQuizDetail(value: unknown): value is QuizDetail {
  if (!isRecord(value)) return false;

  return typeof value.id === "string"
    && typeof value.document_id === "string"
    && typeof value.title === "string"
    && Array.isArray(value.questions)
    && value.questions.length > 0
    && value.questions.every(isQuizQuestion);
}

function isQuizAttempt(value: unknown): value is QuizAttempt {
  if (!isRecord(value)) return false;

  return typeof value.attempt_id === "string"
    && typeof value.quiz_id === "string"
    && Number.isInteger(value.question_count)
    && Number.isInteger(value.correct_count)
    && typeof value.score_percent === "number"
    && Number.isFinite(value.score_percent)
    && typeof value.submitted_at === "string";
}

function isReviewedQuizAnswer(value: unknown): value is ReviewedQuizAnswer {
  if (!isRecord(value)) return false;

  return typeof value.question_id === "string"
    && Number.isInteger(value.selected_option)
    && Number(value.selected_option) >= 0
    && Number(value.selected_option) <= 3
    && Number.isInteger(value.correct_option)
    && Number(value.correct_option) >= 0
    && Number(value.correct_option) <= 3
    && typeof value.is_correct === "boolean"
    && typeof value.explanation === "string"
    && Number.isInteger(value.position)
    && typeof value.question_text === "string"
    && Array.isArray(value.options)
    && value.options.length === 4
    && value.options.every((option: unknown) => typeof option === "string");
}

function isStudyAttemptReview(value: unknown): value is StudyAttemptReview {
  if (!isRecord(value)) return false;

  return typeof value.attempt_id === "string"
    && typeof value.quiz_id === "string"
    && Number.isInteger(value.question_count)
    && Number.isInteger(value.correct_count)
    && typeof value.score_percent === "number"
    && Number.isFinite(value.score_percent)
    && typeof value.submitted_at === "string"
    && Array.isArray(value.answers)
    && value.answers.every(isReviewedQuizAnswer);
}

function parseResult(value: unknown): QuizResult {
  const data = isRecord(value) ? value : {};

  const reviews: AnswerReview[] = Array.isArray(data.answers)
    ? data.answers.flatMap((item: unknown): AnswerReview[] => {
        if (!isRecord(item) || typeof item.question_id !== "string") return [];

        return [{
          question_id: item.question_id,
          correct_option: typeof item.correct_option === "number" ? item.correct_option : null,
          is_correct: typeof item.is_correct === "boolean" ? item.is_correct : null,
          explanation: typeof item.explanation === "string" ? item.explanation : null,
        }];
      })
    : [];

  return {
    attemptId: typeof data.attempt_id === "string" ? data.attempt_id : null,
    scorePercent: typeof data.score_percent === "number" && Number.isFinite(data.score_percent)
      ? data.score_percent
      : null,
    correctCount: typeof data.correct_count === "number" ? data.correct_count : null,
    reviews,
  };
}

// Generar un cuestionario nuevo.
export async function generateStudyQuiz(input: GenerateQuizInput): Promise<GeneratedQuiz> {
  if (generationInProgress) throw new Error("Ya se está generando un cuestionario.");

  const title = input.title.trim();

  if (!input.documentId.trim()) throw new Error("Selecciona un documento válido.");
  if (!title) throw new Error("El cuestionario necesita un título.");

  if (!Number.isInteger(input.questionCount) || input.questionCount < 1 || input.questionCount > 20) {
    throw new Error("La cantidad debe estar entre 1 y 20 preguntas.");
  }

  if (!["facil", "intermedia", "dificil"].includes(input.difficulty)) {
    throw new Error("Dificultad no válida.");
  }

  generationInProgress = true;

  try {
    const data = await request("/quizzes/generate", "POST", {
      document_id: input.documentId,
      title,
      question_count: input.questionCount,
      difficulty: input.difficulty,
    });

    return { id: getQuizId(data), title };
  } finally {
    generationInProgress = false;
  }
}

// Consultar todos los cuestionarios.
export async function getStudyQuizzes(): Promise<QuizSummary[]> {
  const data = await request("/quizzes");

  if (!isRecord(data) || !Array.isArray(data.quizzes) || !data.quizzes.every(isQuizSummary)) {
    throw new Error("FastAPI devolvió un formato de listado de cuestionarios inesperado.");
  }

  return data.quizzes;
}

// Consultar las preguntas de un cuestionario.
export async function getStudyQuiz(id: string): Promise<QuizDetail> {
  if (!id.trim()) throw new Error("Identificador de cuestionario no válido.");

  const data = await request(`/quizzes/${encodeURIComponent(id)}`);

  if (!isQuizDetail(data)) {
    throw new Error("FastAPI devolvió un formato de cuestionario inesperado.");
  }

  return data;
}

// Comprobar una respuesta de Práctica sin guardar intentos.
export async function checkStudyPracticeAnswer(id: string, answer: QuizAnswer): Promise<PracticeCheckResult> {
  if (
    !id.trim() ||
    !answer.question_id.trim() ||
    !Number.isInteger(answer.selected_option) ||
    answer.selected_option < 0 ||
    answer.selected_option > 3
  ) {
    throw new Error("Selecciona una respuesta válida para comprobarla.");
  }

  const data = await request(`/quizzes/${encodeURIComponent(id)}/practice/check`, "POST", answer);

  if (!isRecord(data)) {
    throw new Error("FastAPI devolvió una comprobación inesperada.");
  }

  if (
    !Number.isInteger(data.correct_option) ||
    Number(data.correct_option) < 0 ||
    Number(data.correct_option) > 3 ||
    typeof data.is_correct !== "boolean"
  ) {
    throw new Error("FastAPI no devolvió una respuesta correcta válida.");
  }

  if (typeof data.question_id === "string" && data.question_id !== answer.question_id) {
    throw new Error("La revisión no corresponde a la pregunta seleccionada.");
  }

  return {
    question_id: answer.question_id,
    correct_option: Number(data.correct_option),
    is_correct: data.is_correct,
    explanation: typeof data.explanation === "string" ? data.explanation : "",
  };
}

// Entregar un Examen y guardar el intento.
export async function submitStudyQuiz(id: string, answers: QuizAnswer[]): Promise<QuizResult> {
  if (
    !answers.length ||
    answers.some((item) =>
      !Number.isInteger(item.selected_option) ||
      item.selected_option < 0 ||
      item.selected_option > 3
    )
  ) {
    throw new Error("Completa todas las respuestas antes de entregar.");
  }

  const data = await request(`/quizzes/${encodeURIComponent(id)}/submit`, "POST", { answers });
  return parseResult(data);
}

// Consultar el historial de intentos.
export async function getStudyQuizAttempts(quizId: string): Promise<QuizAttempt[]> {
  if (!quizId.trim()) throw new Error("Identificador de cuestionario no válido.");

  const data = await request(`/quizzes/${encodeURIComponent(quizId)}/attempts`);

  if (!isRecord(data) || !Array.isArray(data.attempts) || !data.attempts.every(isQuizAttempt)) {
    throw new Error("FastAPI devolvió un formato de historial inesperado.");
  }

  return data.attempts;
}

// Consultar la revisión detallada de un intento.
export async function getStudyAttemptReview(
  quizId: string,
  attemptId: string
): Promise<StudyAttemptReview> {
  if (!quizId.trim() || !attemptId.trim()) {
    throw new Error("Identificador de intento no válido.");
  }

  const data = await request(
    `/quizzes/${encodeURIComponent(quizId)}/attempts/${encodeURIComponent(attemptId)}`
  );

  if (!isStudyAttemptReview(data)) {
    throw new Error("FastAPI devolvió un formato de revisión inesperado.");
  }

  if (data.quiz_id !== quizId || data.attempt_id !== attemptId) {
    throw new Error("La revisión no corresponde al intento solicitado.");
  }

  return {
    ...data,
    answers: [...data.answers].sort((a, b) => a.position - b.position),
  };
}