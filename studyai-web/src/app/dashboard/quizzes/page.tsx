"use client";

import { QuizzesSkeleton } from "./skeleton";

import Link from "next/link";
import { redirectExpiredSession as redirectToLogin } from "@/lib/session-client";
import {
  ViewTransition,
  startTransition,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

type Quiz = {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  question_count: number;
};

type QuizzesState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; message: string }
  | { status: "ready"; quizzes: Quiz[] };

function isQuiz(value: unknown): value is Quiz {
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
    typeof data.created_at === "string" &&
    typeof data.question_count === "number" &&
    Number.isInteger(data.question_count) &&
    data.question_count >= 0
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeZone: "America/Costa_Rica",
  }).format(date);
}

function QuizzesContent({ quizzes }: { quizzes: Quiz[] }) {
  const totalQuestions = quizzes.reduce(
    (total, quiz) => total + quiz.question_count,
    0,
  );

  const stats = [
    {
      label: "Cuestionarios creados",
      value: quizzes.length.toLocaleString("es-CR"),
    },
    {
      label: "Preguntas generadas",
      value: totalQuestions.toLocaleString("es-CR"),
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">
          Biblioteca de evaluaciones
        </p>

        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Mis cuestionarios
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Consulta las evaluaciones que has generado con StudyAI,
          resuelve cuestionarios y revisa tus resultados anteriores.
        </p>
      </header>

      <section
        aria-label="Estadísticas de cuestionarios"
        className="grid gap-4 sm:grid-cols-2"
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

      <section aria-labelledby="quizzes-list-title">
        <div className="mb-5">
          <h2
            id="quizzes-list-title"
            className="font-display text-2xl font-semibold"
          >
            Todas las evaluaciones
          </h2>

          <p className="mt-2 text-sm text-muted">
            Cuestionarios disponibles para estudiar nuevamente.
          </p>
        </div>

        {quizzes.length === 0 ? (
          <div className="rounded-2xl border border-input-border bg-surface p-8 text-center">
            <h3 className="font-display text-xl font-semibold">
              Todavía no tienes cuestionarios
            </h3>

            <p className="mt-3 text-sm leading-6 text-muted">
              Abre uno de tus documentos y genera tu primera
              evaluación con inteligencia artificial.
            </p>

            <Link
              href="/dashboard/documents"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110"
            >
              Ir a mis documentos
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {quizzes.map((quiz) => (
              <article
                key={quiz.id}
                className="flex flex-col justify-between gap-7 rounded-2xl border border-input-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transition-none sm:p-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                      {quiz.question_count}{" "}
                      {quiz.question_count === 1
                        ? "pregunta"
                        : "preguntas"}
                    </span>

                    <span className="text-xs text-muted">
                      {formatDate(quiz.created_at)}
                    </span>
                  </div>

                  <h3 className="mt-6 break-words font-display text-xl font-semibold leading-7 tracking-tight">
                    {quiz.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-muted">
                    Evaluación de opción única generada a partir
                    de un documento de estudio.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-input-border pt-5">
                  <Link
                    href={`/dashboard/quizzes/${encodeURIComponent(quiz.id)}`}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none"
                  >
                    Resolver
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link
                    href={`/dashboard/quizzes/${encodeURIComponent(quiz.id)}/attempts`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-input-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-surface-soft"
                  >
                    Ver historial
                  </Link>

                  <Link
                    href={`/dashboard/documents/${encodeURIComponent(quiz.document_id)}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-input-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-surface-soft"
                  >
                    Ver documento
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function QuizzesPage() {
  const [state, setState] = useState<QuizzesState>({
    status: "loading",
  });

  const [retryKey, setRetryKey] = useState(0);

  useLayoutEffect(() => {
    return () => {
      setState({ status: "loading" });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function redirectExpiredSession() {
      if (controller.signal.aborted) return;

      setState({ status: "redirecting" });

      await redirectToLogin();
    }

    async function loadQuizzes() {
      try {
        const response = await fetch("/api/quizzes", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        const payload: unknown = await response
          .json()
          .catch(() => null);

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          await redirectExpiredSession();
          return;
        }

        if (!response.ok) {
          throw new Error(
            `No se pudieron consultar los cuestionarios (HTTP ${response.status}).`,
          );
        }

        if (
          typeof payload !== "object" ||
          payload === null ||
          !("quizzes" in payload) ||
          !Array.isArray(payload.quizzes) ||
          !payload.quizzes.every(isQuiz)
        ) {
          throw new Error(
            "El servidor devolvió un listado de cuestionarios inesperado.",
          );
        }

        const quizzes = [...payload.quizzes].sort(
          (a, b) =>
            b.created_at.localeCompare(a.created_at),
        );

        if (controller.signal.aborted) return;

        startTransition(() => {
          setState({
            status: "ready",
            quizzes,
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
                : "No se pudieron cargar los cuestionarios.",
          });
        });
      }
    }

    void loadQuizzes();

    return () => {
      controller.abort();
    };
  }, [retryKey]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <ViewTransition default="none" update="auto">
        {state.status === "loading" ? (
          <QuizzesSkeleton />
        ) : state.status === "redirecting" ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-input-border bg-surface p-6"
          >
            <span
              aria-hidden="true"
              className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
            />

            <p className="text-sm text-muted">
              Tu sesión ha terminado. Redirigiendo al inicio
              de sesión...
            </p>
          </div>
        ) : state.status === "error" ? (
          <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
            <h1 className="font-display text-xl font-semibold">
              No se pudieron cargar los cuestionarios
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
          <QuizzesContent quizzes={state.quizzes} />
        )}
      </ViewTransition>
    </main>
  );
}
