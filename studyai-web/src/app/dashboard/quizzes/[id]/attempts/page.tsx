"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { redirectExpiredSession } from "@/lib/session-client";
import {
  Suspense,
  ViewTransition,
  startTransition,
  useEffect,
  useState,
} from "react";

type QuizAttempt = {
  attempt_id: string;
  quiz_id: string;
  question_count: number;
  correct_count: number;
  score_percent: number;
  submitted_at: string;
};

type HistoryState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; message: string }
  | { status: "ready"; attempts: QuizAttempt[] };

function isQuizAttempt(value: unknown): value is QuizAttempt {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const attempt = value as Record<string, unknown>;

  return (
    typeof attempt.attempt_id === "string" &&
    typeof attempt.quiz_id === "string" &&
    Number.isInteger(attempt.question_count) &&
    Number.isInteger(attempt.correct_count) &&
    typeof attempt.score_percent === "number" &&
    Number.isFinite(attempt.score_percent) &&
    typeof attempt.submitted_at === "string"
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
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Costa_Rica",
  }).format(date);
}

function HistorySkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando historial de intentos"
      className="animate-pulse space-y-8 motion-reduce:animate-none"
    >
      <div className="space-y-4">
        <div className="h-4 w-36 rounded-full bg-surface-soft" />
        <div className="h-10 w-72 max-w-full rounded-xl bg-surface-soft" />
        <div className="h-4 w-80 max-w-full rounded-full bg-surface-soft" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {["total", "best", "average"].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-input-border bg-surface p-6"
          >
            <div className="h-4 w-32 rounded-full bg-surface-soft" />
            <div className="mt-4 h-9 w-24 rounded-lg bg-surface-soft" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-accent-soft p-6">
        <div className="h-4 w-32 rounded-full bg-surface-soft" />

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="h-11 w-28 rounded-xl bg-surface-soft" />
            <div className="h-4 w-52 rounded-full bg-surface-soft" />
          </div>

          <div className="h-4 w-36 rounded-full bg-surface-soft" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-7 w-48 rounded-lg bg-surface-soft" />
        <div className="h-4 w-72 max-w-full rounded-full bg-surface-soft" />
      </div>

      <div className="space-y-4">
        {["attempt-a", "attempt-b", "attempt-c"].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-input-border bg-surface p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-3">
                <div className="h-6 w-32 rounded-lg bg-surface-soft" />
                <div className="h-4 w-44 rounded-full bg-surface-soft" />
                <div className="h-4 w-52 rounded-full bg-surface-soft" />
              </div>

              <div className="h-20 w-24 rounded-xl bg-surface-soft" />
            </div>

            <div className="mt-5 border-t border-input-border pt-4">
              <div className="h-11 w-36 rounded-xl bg-surface-soft" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryContent({
  attempts,
}: {
  attempts: QuizAttempt[];
}) {
  if (attempts.length === 0) {
    return (
      <section className="rounded-2xl border border-input-border bg-surface p-8 text-center">
        <h2 className="font-display text-xl font-semibold">
          Aún no tienes intentos
        </h2>

        <p className="mt-3 text-sm leading-6 text-muted">
          Resuelve el cuestionario para registrar tu primera
          calificación.
        </p>
      </section>
    );
  }

  const bestScore = Math.max(
    ...attempts.map((attempt) => attempt.score_percent),
  );

  const averageScore =
    attempts.reduce(
      (total, attempt) => total + attempt.score_percent,
      0,
    ) / attempts.length;

  const latestAttempt = attempts[0];

  const stats = [
    {
      label: "Intentos realizados",
      value: String(attempts.length),
    },
    {
      label: "Mejor calificación",
      value: formatScore(bestScore),
    },
    {
      label: "Promedio de intentos",
      value: formatScore(averageScore),
    },
  ];

  return (
    <div className="space-y-8">
      <section
        aria-label="Estadísticas del historial"
        className="grid gap-4 sm:grid-cols-3"
      >
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-input-border bg-surface p-6"
          >
            <p className="text-sm text-muted">
              {stat.label}
            </p>

            <p className="mt-4 font-display text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-primary/20 bg-accent-soft p-6">
        <p className="text-sm font-medium text-accent-foreground">
          Último resultado
        </p>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-4xl font-semibold tracking-tight">
              {formatScore(latestAttempt.score_percent)}
            </p>

            <p className="mt-2 text-sm text-muted">
              {latestAttempt.correct_count} de{" "}
              {latestAttempt.question_count} respuestas correctas
            </p>
          </div>

          <p className="text-sm text-muted">
            {formatDate(latestAttempt.submitted_at)}
          </p>
        </div>
      </section>

      <section aria-labelledby="attempts-list-title">
        <div className="mb-5">
          <h2
            id="attempts-list-title"
            className="font-display text-2xl font-semibold"
          >
            Todos los intentos
          </h2>

          <p className="mt-2 text-sm text-muted">
            Resultados guardados en tu historial de estudio.
          </p>
        </div>

        <div className="space-y-4">
          {attempts.map((attempt, index) => (
            <article
              key={attempt.attempt_id}
              className="rounded-2xl border border-input-border bg-surface p-5 transition-colors hover:border-primary/30 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-lg font-semibold">
                      Intento {attempts.length - index}
                    </h3>

                    {index === 0 && (
                      <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
                        Más reciente
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted">
                    {formatDate(attempt.submitted_at)}
                  </p>

                  <p className="text-sm text-muted">
                    {attempt.correct_count} de{" "}
                    {attempt.question_count} respuestas correctas
                  </p>
                </div>

                <div className="rounded-xl bg-accent-soft px-4 py-3 text-center">
                  <p className="font-display text-2xl font-semibold tracking-tight text-accent-foreground">
                    {formatScore(attempt.score_percent)}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    Calificación
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-input-border pt-4">
                <Link
                  href={`/dashboard/quizzes/${encodeURIComponent(attempt.quiz_id)}/attempts/${encodeURIComponent(attempt.attempt_id)}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-input-border bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-surface-soft"
                >
                  Ver revisión
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuizAttemptsView({
  quizId,
}: {
  quizId: string;
}) {
  const [state, setState] = useState<HistoryState>({
    status: "loading",
  });

  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function handleExpiredSession() {
      if (controller.signal.aborted) return;

      startTransition(() => {
        setState({ status: "redirecting" });
      });

      await redirectExpiredSession();
    }

    async function loadHistory() {
      try {
        const response = await fetch(
          `/api/quizzes/${encodeURIComponent(quizId)}/attempts`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          await handleExpiredSession();
          return;
        }

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "El cuestionario no existe o no tienes acceso.",
            );
          }

          throw new Error(
            "No se pudo consultar el historial.",
          );
        }

        const payload: unknown = await response.json();

        if (
          typeof payload !== "object" ||
          payload === null ||
          !("attempts" in payload) ||
          !Array.isArray(payload.attempts) ||
          !payload.attempts.every(isQuizAttempt)
        ) {
          throw new Error(
            "El servidor devolvió un historial inesperado.",
          );
        }

        const attempts = payload.attempts
          .filter((attempt) => attempt.quiz_id === quizId)
          .sort((a, b) =>
            b.submitted_at.localeCompare(a.submitted_at),
          );

        if (controller.signal.aborted) return;

        startTransition(() => {
          setState({
            status: "ready",
            attempts,
          });
        });
      } catch (caught) {
        if (controller.signal.aborted) return;

        startTransition(() => {
          setState({
            status: "error",
            message:
              caught instanceof Error
                ? caught.message
                : "No se pudo cargar el historial.",
          });
        });
      }
    }

    void loadHistory();

    return () => {
      controller.abort();
    };
  }, [quizId, retryKey]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <Link
        href="/dashboard/quizzes"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
      >
        <span aria-hidden="true">←</span>
        Volver a cuestionarios
      </Link>

      <div className="mt-8">
        <ViewTransition default="none" update="auto">
          {state.status === "loading" ? (
            <HistorySkeleton />
          ) : state.status === "redirecting" ? (
            <div
              role="status"
              className="rounded-2xl border border-input-border bg-surface p-6"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
                />

                <p className="text-sm text-muted">
                  Tu sesión ha terminado. Redirigiendo al inicio
                  de sesión...
                </p>
              </div>
            </div>
          ) : state.status === "error" ? (
            <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
              <h1 className="font-display text-xl font-semibold">
                No se pudo cargar el historial
              </h1>

              <p role="alert" className="mt-3 text-sm text-muted">
                {state.message}
              </p>

              <button
                type="button"
                onClick={() => {
                  setState({ status: "loading" });
                  setRetryKey((value) => value + 1);
                }}
                className="mt-6 min-h-11 cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110"
              >
                Reintentar
              </button>
            </section>
          ) : (
            <div className="space-y-8">
              <header>
                <p className="text-sm font-medium text-primary">
                  Progreso de estudio
                </p>

                <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Historial de intentos
                </h1>

                <p className="mt-3 text-sm text-muted">
                  Consulta tus calificaciones y la evolución
                  de tu aprendizaje.
                </p>
              </header>

              <HistoryContent attempts={state.attempts} />
            </div>
          )}
        </ViewTransition>
      </div>
    </main>
  );
}

function QuizAttemptsContent() {
  const { id } = useParams<{ id: string }>();

  return <QuizAttemptsView key={id} quizId={id} />;
}

export default function QuizAttemptsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
          <div className="h-4 w-40 animate-pulse rounded-full bg-surface-soft motion-reduce:animate-none" />

          <div className="mt-8">
            <HistorySkeleton />
          </div>
        </main>
      }
    >
      <QuizAttemptsContent />
    </Suspense>
  );
}