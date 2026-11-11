"use client";
import { DashboardBackLink } from "@/components/dashboard/dashboard-navigation";

import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";

import Link from "next/link";
import { redirectExpiredSession as redirectToLogin } from "@/lib/session-client";
import { useParams } from "next/navigation";
import { Suspense, ViewTransition, startTransition, useEffect, useState } from "react";

type ReviewedAnswer = {
  question_id: string;
  selected_option: number;
  correct_option: number;
  is_correct: boolean;
  explanation: string;
  position: number;
  question_text: string;
  options: string[];
};

type AttemptReview = {
  attempt_id: string;
  quiz_id: string;
  question_count: number;
  correct_count: number;
  score_percent: number;
  submitted_at: string;
  answers: ReviewedAnswer[];
};

type ReviewState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; message: string }
  | { status: "ready"; attempt: AttemptReview };

function isAttemptReview(value: unknown): value is AttemptReview {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.attempt_id === "string" &&
    typeof data.quiz_id === "string" &&
    typeof data.question_count === "number" &&
    Number.isInteger(data.question_count) &&
    typeof data.correct_count === "number" &&
    Number.isInteger(data.correct_count) &&
    typeof data.score_percent === "number" &&
    Number.isFinite(data.score_percent) &&
    typeof data.submitted_at === "string" &&
    Array.isArray(data.answers) &&
    data.answers.every((item: unknown) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return false;
      }

      const answer = item as Record<string, unknown>;

      return (
        typeof answer.question_id === "string" &&
        typeof answer.selected_option === "number" &&
        Number.isInteger(answer.selected_option) &&
        answer.selected_option >= 0 &&
        answer.selected_option <= 3 &&
        typeof answer.correct_option === "number" &&
        Number.isInteger(answer.correct_option) &&
        answer.correct_option >= 0 &&
        answer.correct_option <= 3 &&
        typeof answer.is_correct === "boolean" &&
        typeof answer.explanation === "string" &&
        typeof answer.position === "number" &&
        Number.isInteger(answer.position) &&
        typeof answer.question_text === "string" &&
        Array.isArray(answer.options) &&
        answer.options.length === 4 &&
        answer.options.every((option: unknown) => typeof option === "string")
      );
    })
  );
}

function formatScore(value: number): string {
  return `${value.toLocaleString("es-CR", {
    maximumFractionDigits: 2,
  })}%`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  }).format(date);
}

function AttemptReviewSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando revisión del intento"
      className="animate-pulse space-y-8 motion-reduce:animate-none"
    >
      <div className="space-y-4">
        <div className="h-4 w-32 rounded-full bg-surface-soft" />
        <div className="h-10 w-64 max-w-full rounded-xl bg-surface-soft" />
        <div className="h-4 w-52 rounded-full bg-surface-soft" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {["score", "correct", "questions"].map((item) => (
          <div key={item} className="rounded-2xl border border-input-border bg-surface p-6">
            <div className="h-4 w-32 rounded-full bg-surface-soft" />
            <div className="mt-4 h-9 w-24 rounded-lg bg-surface-soft" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="h-7 w-52 rounded-lg bg-surface-soft" />
        <div className="h-4 w-72 max-w-full rounded-full bg-surface-soft" />
      </div>

      <div className="space-y-5">
        {["question-1", "question-2", "question-3"].map((item) => (
          <div key={item} className="rounded-2xl border border-input-border bg-surface p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className="h-6 w-24 rounded-full bg-surface-soft" />
              <div className="h-6 w-24 rounded-full bg-surface-soft" />
            </div>

            <div className="mt-6 space-y-3">
              <div className="h-5 w-full rounded-lg bg-surface-soft" />
              <div className="h-5 w-4/5 rounded-lg bg-surface-soft" />
            </div>

            <div className="mt-7 space-y-3">
              {["a", "b", "c", "d"].map((option) => (
                <div key={option} className="h-14 rounded-xl bg-surface-soft" />
              ))}
            </div>

            <div className="mt-6 rounded-xl bg-surface-soft p-5">
              <div className="h-4 w-28 rounded-full bg-surface" />
              <div className="mt-4 h-4 w-full rounded-full bg-surface" />
              <div className="mt-3 h-4 w-3/4 rounded-full bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttemptReviewContent({ attempt }: { attempt: AttemptReview }) {
  const answers = [...attempt.answers].sort((a, b) => a.position - b.position);

  const stats = [
    {
      label: "Calificación",
      value: formatScore(attempt.score_percent),
    },
    {
      label: "Respuestas correctas",
      value: `${attempt.correct_count} / ${attempt.question_count}`,
    },
    {
      label: "Preguntas evaluadas",
      value: String(attempt.question_count),
    },
  ];

  return (
    <DashboardReveal className="space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">Evaluación completada</p>

        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Revisión del intento
        </h1>

        <p className="mt-3 text-sm text-muted">Entregado el {formatDate(attempt.submitted_at)}</p>
      </header>

      <section aria-label="Resultados del intento" className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="workspace-panel px-5 py-4">
            <p className="text-sm text-muted">{stat.label}</p>

            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</p>
          </article>
        ))}
      </section>

      <div>
        <h2 className="font-display text-lg font-semibold">Revisión de respuestas</h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Revisa tus respuestas, identifica las correctas y consulta las explicaciones generadas
          para este cuestionario.
        </p>
      </div>

      <section aria-label="Preguntas revisadas" className="space-y-5">
        {answers.map((answer) => (
          <article key={answer.question_id} className="workspace-panel overflow-hidden">
            <div className="p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                  Pregunta {answer.position}
                </span>

                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    answer.is_correct
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  <span aria-hidden="true">{answer.is_correct ? "✓" : "✕"}</span>

                  {answer.is_correct ? "Respuesta correcta" : "Respuesta incorrecta"}
                </span>
              </div>

              <h3 className="mt-6 text-lg font-semibold leading-8">{answer.question_text}</h3>

              <div className="mt-7 space-y-3">
                {answer.options.map((option, index) => {
                  const isSelected = index === answer.selected_option;

                  const isCorrect = index === answer.correct_option;

                  const optionStyle = isCorrect
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : isSelected
                      ? "border-red-500/40 bg-red-500/5"
                      : "border-input-border bg-background";

                  return (
                    <div key={option} className={`rounded-xl border p-4 ${optionStyle}`}>
                      <div className="flex items-start gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-input-border bg-surface text-xs font-semibold">
                          {String.fromCharCode(65 + index)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm leading-6">{option}</p>

                          {(isSelected || isCorrect) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {isSelected && (
                                <span className="rounded-full border border-input-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
                                  Tu respuesta
                                </span>
                              )}

                              {isCorrect && (
                                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                                  Respuesta correcta
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl bg-surface-soft p-5">
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-lg text-primary">
                    ✦
                  </span>

                  <h4 className="text-sm font-semibold">Explicación</h4>
                </div>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                  {answer.explanation}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <DashboardBackLink
          href={`/dashboard/quizzes/${encodeURIComponent(attempt.quiz_id)}/attempts`}
        >
          Volver al historial
        </DashboardBackLink>

        <Link
          href={`/dashboard/quizzes/${encodeURIComponent(attempt.quiz_id)}`}
          className="workspace-action"
        >
          Resolver nuevamente
        </Link>
      </div>
    </DashboardReveal>
  );
}

function AttemptReviewView({ quizId, attemptId }: { quizId: string; attemptId: string }) {
  const [state, setState] = useState<ReviewState>({
    status: "loading",
  });

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function redirectExpiredSession() {
      if (controller.signal.aborted) {
        return;
      }

      setState({ status: "redirecting" });

      await redirectToLogin();
    }

    async function loadAttempt() {
      try {
        const url =
          `/api/quizzes/${encodeURIComponent(quizId)}` +
          `/attempts/${encodeURIComponent(attemptId)}`;

        const response = await fetch(url, {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });

        const payload: unknown = await response.json().catch(() => null);

        if (controller.signal.aborted) {
          return;
        }

        if (response.status === 401) {
          await redirectExpiredSession();
          return;
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("El intento no existe o no tienes acceso a él.");
          }

          throw new Error(
            `No se pudo consultar la revisión del intento (HTTP ${response.status}).`,
          );
        }

        if (!isAttemptReview(payload)) {
          throw new Error("El servidor devolvió una revisión con un formato inesperado.");
        }

        if (payload.quiz_id !== quizId || payload.attempt_id !== attemptId) {
          throw new Error("Los datos recibidos no corresponden al intento solicitado.");
        }

        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setState({
            status: "ready",
            attempt: payload,
          });
        });
      } catch (caught) {
        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setState({
            status: "error",
            message: caught instanceof Error ? caught.message : "No se pudo cargar la revisión.",
          });
        });
      }
    }

    void loadAttempt();

    return () => {
      controller.abort();
    };
  }, [quizId, attemptId, retryKey]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <DashboardBackLink href={`/dashboard/quizzes/${encodeURIComponent(quizId)}/attempts`}>
        Volver al historial
      </DashboardBackLink>

      <div className="mt-8">
        <ViewTransition default="none" update="workspace-swap">
          {state.status === "loading" ? (
            <AttemptReviewSkeleton />
          ) : state.status === "redirecting" ? (
            <div role="status" className="workspace-panel flex items-center gap-3 p-6">
              <span
                aria-hidden="true"
                className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
              />

              <p className="text-sm text-muted">
                Tu sesión ha terminado. Redirigiendo al inicio de sesión...
              </p>
            </div>
          ) : state.status === "error" ? (
            <section className="workspace-panel p-6 sm:p-8">
              <h1 className="font-display text-xl font-semibold">No se pudo cargar la revisión</h1>

              <p role="alert" className="mt-3 text-sm text-muted">
                {state.message}
              </p>

              <button
                type="button"
                onClick={() => {
                  setState({ status: "loading" });
                  setRetryKey((value) => value + 1);
                }}
                className="workspace-action workspace-action-primary mt-6"
              >
                Reintentar
              </button>
            </section>
          ) : (
            <AttemptReviewContent attempt={state.attempt} />
          )}
        </ViewTransition>
      </div>
    </main>
  );
}

function AttemptReviewPageContent() {
  const { id, attemptId } = useParams<{
    id: string;
    attemptId: string;
  }>();

  return <AttemptReviewView key={`${id}:${attemptId}`} quizId={id} attemptId={attemptId} />;
}

export default function AttemptReviewPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <div className="h-4 w-40 animate-pulse rounded-full bg-surface-soft motion-reduce:animate-none" />

          <div className="mt-8">
            <AttemptReviewSkeleton />
          </div>
        </main>
      }
    >
      <AttemptReviewPageContent />
    </Suspense>
  );
}
