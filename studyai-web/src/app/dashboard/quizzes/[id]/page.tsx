"use client";

import Link from "next/link";
import { redirectExpiredSession } from "@/lib/session-client";
import { useParams } from "next/navigation";
import {
  Suspense,
  ViewTransition,
  startTransition,
  useEffect,
  useState,
} from "react";

type QuizQuestion = {
  id: string;
  position: number;
  question_text: string;
  options: string[];
};

type QuizDetail = {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  questions: QuizQuestion[];
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; quiz: QuizDetail };

type AnswerReview = {
  question_id: string;
  correct_option: number | null;
  is_correct: boolean | null;
  explanation: string | null;
};

type QuizResult = {
  attemptId: string | null;
  scorePercent: number | null;
  correctCount: number | null;
  reviews: AnswerReview[];
};

function isQuizDetail(value: unknown): value is QuizDetail {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.id === "string" &&
    typeof data.document_id === "string" &&
    typeof data.title === "string" &&
    Array.isArray(data.questions) &&
    data.questions.length > 0 &&
    data.questions.every((item: unknown) => {
      if (
        typeof item !== "object" ||
        item === null ||
        Array.isArray(item)
      ) {
        return false;
      }

      const question = item as Record<string, unknown>;

      return (
        typeof question.id === "string" &&
        typeof question.position === "number" &&
        typeof question.question_text === "string" &&
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        question.options.every(
          (option: unknown) => typeof option === "string",
        )
      );
    })
  );
}

function getApiError(
  value: unknown,
  fallback: string,
): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "detail" in value &&
    typeof value.detail === "string"
  ) {
    return value.detail;
  }

  return fallback;
}

function parseAnswerReviews(value: unknown): AnswerReview[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const reviews: AnswerReview[] = [];

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item)
    ) {
      continue;
    }

    const data = item as Record<string, unknown>;

    if (typeof data.question_id !== "string") {
      continue;
    }

    reviews.push({
      question_id: data.question_id,
      correct_option:
        typeof data.correct_option === "number"
          ? data.correct_option
          : null,
      is_correct:
        typeof data.is_correct === "boolean"
          ? data.is_correct
          : null,
      explanation:
        typeof data.explanation === "string"
          ? data.explanation
          : null,
    });
  }

  return reviews;
}

function parseQuizResult(value: unknown): QuizResult {
  const data =
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    attemptId:
      typeof data.attempt_id === "string"
        ? data.attempt_id
        : null,
    scorePercent:
      typeof data.score_percent === "number" &&
      Number.isFinite(data.score_percent)
        ? data.score_percent
        : null,
    correctCount:
      typeof data.correct_count === "number"
        ? data.correct_count
        : null,
    reviews: parseAnswerReviews(data.answers),
  };
}

function transitionTo(callback: () => void) {
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    callback();
    return;
  }

  startTransition(callback);
}

function QuizSkeleton() {
  return (
    <main
      role="status"
      aria-label="Cargando cuestionario"
      className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12"
    >
      <div className="animate-pulse space-y-8 motion-reduce:animate-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="h-4 w-40 rounded-full bg-surface-soft" />
          <div className="h-11 w-32 rounded-xl bg-surface-soft" />
        </div>

        <div className="space-y-4">
          <div className="h-4 w-32 rounded-full bg-surface-soft" />
          <div className="h-10 w-3/4 max-w-xl rounded-xl bg-surface-soft" />
          <div className="h-4 w-48 rounded-full bg-surface-soft" />
        </div>

        <div className="h-2 w-full rounded-full bg-surface-soft" />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
            <div className="h-4 w-28 rounded-full bg-surface-soft" />

            <div className="mt-6 space-y-3">
              <div className="h-6 w-full rounded-lg bg-surface-soft" />
              <div className="h-6 w-4/5 rounded-lg bg-surface-soft" />
            </div>

            <div className="mt-9 space-y-3">
              {["a", "b", "c", "d"].map((item) => (
                <div
                  key={item}
                  className="h-16 rounded-xl bg-surface-soft"
                />
              ))}
            </div>

            <div className="mt-10 flex justify-between gap-4">
              <div className="h-11 w-28 rounded-xl bg-surface-soft" />
              <div className="h-11 w-28 rounded-xl bg-surface-soft" />
            </div>
          </div>

          <div className="rounded-2xl border border-input-border bg-surface p-6">
            <div className="h-5 w-36 rounded-lg bg-surface-soft" />

            <div className="mt-6 grid grid-cols-4 gap-3">
              {["1", "2", "3", "4"].map((item) => (
                <div
                  key={item}
                  className="aspect-square rounded-xl bg-surface-soft"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function QuizResults({
  quiz,
  answers,
  result,
  onRetry,
}: {
  quiz: QuizDetail;
  answers: Record<string, number>;
  result: QuizResult;
  onRetry: () => void;
}) {
  const documentUrl =
    `/dashboard/documents/${encodeURIComponent(quiz.document_id)}`;

  const formattedScore =
    result.scorePercent !== null
      ? `${result.scorePercent.toLocaleString("es-CR", {
          maximumFractionDigits: 2,
        })}%`
      : null;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-input-border bg-surface">
        <div className="border-b border-input-border bg-accent-soft p-6 sm:p-8">
          <p className="text-sm font-semibold text-accent-foreground">
            Evaluación entregada
          </p>

          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Resultados del cuestionario
          </h2>

          <p className="mt-3 text-sm leading-6 text-muted">
            Tu intento se envió correctamente a StudyAI.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
          <div className="rounded-2xl border border-input-border bg-background p-6">
            <p className="text-sm text-muted">
              Calificación
            </p>

            <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-primary">
              {formattedScore ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-input-border bg-background p-6">
            <p className="text-sm text-muted">
              Respuestas correctas
            </p>

            <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
              {result.correctCount !== null
                ? `${result.correctCount} / ${quiz.questions.length}`
                : "—"}
            </p>
          </div>
        </div>

        {result.attemptId && (
          <p className="px-6 pb-6 text-xs text-muted sm:px-8">
            Identificador del intento: {result.attemptId}
          </p>
        )}
      </section>

      {result.reviews.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="font-display text-xl font-semibold">
              Revisión de respuestas
            </h3>

            <p className="mt-2 text-sm text-muted">
              Consulta la evaluación de cada pregunta.
            </p>
          </div>

          {quiz.questions.map((question, index) => {
            const review = result.reviews.find(
              (item) => item.question_id === question.id,
            );

            const selected = answers[question.id];

            return (
              <article
                key={question.id}
                className="rounded-2xl border border-input-border bg-surface p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-primary">
                    Pregunta {index + 1}
                  </span>

                  {review?.is_correct !== null &&
                    review?.is_correct !== undefined && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          review.is_correct
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {review.is_correct
                          ? "Correcta"
                          : "Incorrecta"}
                      </span>
                    )}
                </div>

                <h4 className="mt-4 text-base font-semibold leading-7">
                  {question.question_text}
                </h4>

                <p className="mt-4 text-sm text-muted">
                  Tu respuesta:{" "}
                  <span className="font-medium text-foreground">
                    {question.options[selected] ?? "No disponible"}
                  </span>
                </p>

                {review?.correct_option !== null &&
                  review?.correct_option !== undefined &&
                  question.options[review.correct_option] && (
                    <p className="mt-3 text-sm text-muted">
                      Respuesta correcta:{" "}
                      <span className="font-medium text-foreground">
                        {question.options[review.correct_option]}
                      </span>
                    </p>
                  )}

                {review?.explanation && (
                  <div className="mt-5 rounded-xl bg-surface-soft p-4">
                    <p className="text-xs font-semibold text-primary">
                      Explicación
                    </p>

                    <p className="mt-2 text-sm leading-6">
                      {review.explanation}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <p className="rounded-2xl border border-input-border bg-surface p-5 text-sm leading-6 text-muted">
          El intento quedó registrado. La revisión detallada de
          respuestas y explicaciones se conectará mediante el
          endpoint de consulta del intento.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none"
        >
          Intentar nuevamente
        </button>

        <Link
          href={`/dashboard/quizzes/${encodeURIComponent(quiz.id)}/attempts`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-input-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:bg-surface-soft"
        >
          Ver historial
        </Link>

        <Link
          href={documentUrl}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-input-border bg-surface px-5 py-3 text-sm font-medium transition-colors hover:bg-surface-soft"
        >
          Volver al documento
        </Link>
      </div>
    </div>
  );
}

function QuizSession({ quizId }: { quizId: string }) {
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
  });

  const [reloadKey, setReloadKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<string, number>>(
    {},
  );

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuiz() {
      try {
        const response = await fetch(
          `/api/quizzes/${encodeURIComponent(quizId)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          if (response.status === 401) {
            if (!controller.signal.aborted) await redirectExpiredSession();
            return;
          }

          if (response.status === 404) {
            throw new Error(
              "El cuestionario no existe o no tienes acceso.",
            );
          }

          throw new Error(
            "No se pudo consultar el cuestionario.",
          );
        }

        const payload: unknown = await response.json();

        if (!isQuizDetail(payload)) {
          throw new Error(
            "El servidor devolvió un cuestionario con un formato inesperado.",
          );
        }

        const quiz: QuizDetail = {
          ...payload,
          questions: [...payload.questions].sort(
            (a, b) => a.position - b.position,
          ),
        };

        if (controller.signal.aborted) return;

        startTransition(() => {
          setLoadState({
            status: "ready",
            quiz,
          });
        });
      } catch (caught) {
        if (controller.signal.aborted) return;

        startTransition(() => {
          setLoadState({
            status: "error",
            message:
              caught instanceof Error
                ? caught.message
                : "No se pudo cargar el cuestionario.",
          });
        });
      }
    }

    void loadQuiz();

    return () => {
      controller.abort();
    };
  }, [quizId, reloadKey]);

  if (loadState.status === "loading") {
    return <QuizSkeleton />;
  }

  if (loadState.status === "error") {
    return (
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <Link
          href="/dashboard/documents"
          className="text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          ← Volver a documentos
        </Link>

        <section className="mt-8 rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
          <h1 className="font-display text-xl font-semibold">
            No se pudo cargar el cuestionario
          </h1>

          <p role="alert" className="mt-3 text-sm text-muted">
            {loadState.message}
          </p>

          <button
            type="button"
            onClick={() => {
              setLoadState({ status: "loading" });
              setReloadKey((value) => value + 1);
            }}
            className="mt-6 min-h-11 cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  const { quiz } = loadState;
  const questions = quiz.questions;

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const answeredCount = questions.filter(
    (question) => answers[question.id] !== undefined,
  ).length;

  const remainingCount = totalQuestions - answeredCount;
  const allAnswered = remainingCount === 0;

  const progress = Math.round(
    (answeredCount / totalQuestions) * 100,
  );

  const documentUrl =
    `/dashboard/documents/${encodeURIComponent(quiz.document_id)}`;

  function goToQuestion(index: number) {
    if (
      index < 0 ||
      index >= totalQuestions ||
      isSubmitting
    ) {
      return;
    }

    transitionTo(() => {
      setCurrentIndex(index);
      setShowConfirmation(false);
    });
  }

  function selectAnswer(index: number) {
    if (isSubmitting || result) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: index,
    }));

    setSubmissionError("");
    setShowConfirmation(false);
  }

  async function submitQuiz() {
    if (!allAnswered || isSubmitting || result) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const response = await fetch(
        `/api/quizzes/${encodeURIComponent(quiz.id)}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          cache: "no-store",
          credentials: "same-origin",
          body: JSON.stringify({
            answers: questions.map((question) => ({
              question_id: question.id,
              selected_option: answers[question.id],
            })),
          }),
        },
      );

      if (response.status === 401) {
        await redirectExpiredSession();
        return;
      }

      const payload: unknown = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          getApiError(
            payload,
            "No se pudo entregar el cuestionario.",
          ),
        );
      }

      const parsedResult = parseQuizResult(payload);

      transitionTo(() => {
        setResult(parsedResult);
        setShowConfirmation(false);
      });
    } catch (caught) {
      setSubmissionError(
        caught instanceof Error
          ? caught.message
          : "No se pudo confirmar la entrega. Comprueba el historial antes de intentarlo de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function retryQuiz() {
    transitionTo(() => {
      setAnswers({});
      setCurrentIndex(0);
      setSubmissionError("");
      setShowConfirmation(false);
      setResult(null);
    });
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={documentUrl}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
        >
          <span aria-hidden="true">←</span>
          Volver al documento
        </Link>

        <Link
          href={`/dashboard/quizzes/${encodeURIComponent(quiz.id)}/attempts`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-input-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-surface-soft"
        >
          Ver historial
        </Link>
      </div>

      <header className="mt-8">
        <p className="text-sm font-semibold text-primary">
          Evaluación de StudyAI
        </p>

        <h1 className="mt-3 break-words font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {quiz.title}
        </h1>

        <p className="mt-3 text-sm text-muted">
          {totalQuestions} preguntas de opción única
        </p>
      </header>

      <div className="mt-8">
        <ViewTransition default="none" update="auto">
          {result ? (
            <QuizResults
              quiz={quiz}
              answers={answers}
              result={result}
              onRetry={retryQuiz}
            />
          ) : (
            <div className="space-y-7">
              <section aria-label="Progreso del cuestionario">
                <div className="mb-3 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">
                    {answeredCount} de {totalQuestions} respondidas
                  </span>

                  <span className="font-semibold text-primary">
                    {progress}%
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Preguntas respondidas"
                  aria-valuemin={0}
                  aria-valuemax={totalQuestions}
                  aria-valuenow={answeredCount}
                  className="h-2 overflow-hidden rounded-full bg-surface-soft"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </section>

              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-5">
                  <ViewTransition default="none" update="auto">
                    <section className="rounded-2xl border border-input-border bg-surface p-5 sm:p-8">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                          Pregunta {currentIndex + 1}
                        </span>

                        <span className="text-xs text-muted">
                          {currentIndex + 1} / {totalQuestions}
                        </span>
                      </div>

                      <fieldset className="mt-7">
                        <legend className="text-lg font-semibold leading-8 sm:text-xl">
                          {currentQuestion.question_text}
                        </legend>

                        <div className="mt-7 space-y-3">
                          {currentQuestion.options.map(
                            (option, index) => {
                              const selected =
                                answers[currentQuestion.id] ===
                                index;

                              return (
                                <label
                                  key={`${currentQuestion.id}-${option}`}
                                  className={`flex min-h-16 cursor-pointer items-start gap-4 rounded-xl border p-4 transition-[border-color,background-color,transform] duration-200 active:scale-[0.995] motion-reduce:transition-none ${
                                    selected
                                      ? "border-primary bg-accent-soft"
                                      : "border-input-border bg-background hover:border-primary/60 hover:bg-surface-soft"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`answer-${currentQuestion.id}`}
                                    value={index}
                                    checked={selected}
                                    disabled={isSubmitting}
                                    onChange={() =>
                                      selectAnswer(index)
                                    }
                                    className="mt-1 size-4 shrink-0 accent-primary"
                                  />

                                  <span className="flex min-w-0 flex-1 gap-3 text-sm leading-6">
                                    <span className="font-semibold text-primary">
                                      {String.fromCharCode(65 + index)}.
                                    </span>

                                    <span className="break-words">
                                      {option}
                                    </span>
                                  </span>
                                </label>
                              );
                            },
                          )}
                        </div>
                      </fieldset>

                      <div className="mt-9 flex items-center justify-between gap-3 border-t border-input-border pt-6">
                        <button
                          type="button"
                          disabled={
                            currentIndex === 0 || isSubmitting
                          }
                          onClick={() =>
                            goToQuestion(currentIndex - 1)
                          }
                          className="min-h-11 cursor-pointer rounded-xl border border-input-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors enabled:hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Anterior
                        </button>

                        {currentIndex < totalQuestions - 1 ? (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() =>
                              goToQuestion(currentIndex + 1)
                            }
                            className="min-h-11 cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 motion-reduce:transition-none"
                          >
                            Siguiente →
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-muted">
                            Última pregunta
                          </span>
                        )}
                      </div>
                    </section>
                  </ViewTransition>

                  {showConfirmation && (
                    <section className="rounded-2xl border border-primary/30 bg-accent-soft p-5 sm:p-6">
                      <h2 className="font-display text-lg font-semibold">
                        ¿Entregar cuestionario?
                      </h2>

                      <p className="mt-2 text-sm leading-6 text-muted">
                        Has respondido las {totalQuestions} preguntas.
                        Al confirmar, StudyAI enviará tus respuestas
                        para calificarlas y guardará el intento.
                      </p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setShowConfirmation(false)}
                          className="min-h-11 cursor-pointer rounded-xl border border-input-border bg-surface px-5 py-2.5 text-sm font-medium disabled:opacity-60"
                        >
                          Seguir revisando
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void submitQuiz()}
                          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-3 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmitting && (
                            <span
                              aria-hidden="true"
                              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                            />
                          )}

                          {isSubmitting
                            ? "Calificando..."
                            : "Confirmar entrega"}
                        </button>
                      </div>
                    </section>
                  )}

                  {submissionError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-500"
                    >
                      {submissionError}
                    </p>
                  )}
                </div>

                <aside className="rounded-2xl border border-input-border bg-surface p-5 lg:sticky lg:top-24">
                  <h2 className="font-display text-lg font-semibold">
                    Tu progreso
                  </h2>

                  <p className="mt-2 text-sm text-muted">
                    Selecciona una pregunta para revisarla.
                  </p>

                  <nav
                    aria-label="Navegación de preguntas"
                    className="mt-6 grid grid-cols-5 gap-2 lg:grid-cols-4"
                  >
                    {questions.map((question, index) => {
                      const answered =
                        answers[question.id] !== undefined;

                      const active = currentIndex === index;

                      return (
                        <button
                          key={question.id}
                          type="button"
                          disabled={isSubmitting}
                          aria-label={`Pregunta ${index + 1}${answered ? ", respondida" : ", pendiente"}`}
                          aria-current={
                            active ? "step" : undefined
                          }
                          onClick={() => goToQuestion(index)}
                          className={`flex aspect-square min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-semibold transition-[background-color,border-color,transform] duration-200 active:scale-95 disabled:cursor-not-allowed motion-reduce:transition-none ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : answered
                                ? "border-primary/30 bg-accent-soft text-accent-foreground hover:border-primary"
                                : "border-input-border bg-background text-muted hover:bg-surface-soft"
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </nav>

                  <div className="mt-6 space-y-3 border-t border-input-border pt-5">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-muted">
                        Respondidas
                      </span>

                      <span className="font-semibold">
                        {answeredCount}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-muted">
                        Pendientes
                      </span>

                      <span className="font-semibold">
                        {remainingCount}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!allAnswered || isSubmitting}
                    onClick={() => setShowConfirmation(true)}
                    className="mt-6 min-h-12 w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                  >
                    Entregar cuestionario
                  </button>

                  {!allAnswered && (
                    <p className="mt-3 text-center text-xs leading-5 text-muted">
                      Responde las {remainingCount} preguntas
                      pendientes para entregar.
                    </p>
                  )}
                </aside>
              </div>
            </div>
          )}
        </ViewTransition>
      </div>
    </main>
  );
}

function QuizContent() {
  const { id } = useParams<{ id: string }>();

  return <QuizSession key={id} quizId={id} />;
}

export default function QuizPage() {
  return (
    <Suspense fallback={<QuizSkeleton />}>
      <QuizContent />
    </Suspense>
  );
}
