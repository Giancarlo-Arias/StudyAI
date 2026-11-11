"use client";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";

import { QuizzesSkeleton } from "./skeleton";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";

import Link from "next/link";
import { redirectExpiredSession as redirectToLogin } from "@/lib/session-client";
import { startTransition, useEffect, useLayoutEffect, useState } from "react";

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
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
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
  const totalQuestions = quizzes.reduce((total, quiz) => total + quiz.question_count, 0);

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
    <DashboardReveal className="space-y-5">
      <header>
        <p className="text-sm font-medium text-primary">Biblioteca de evaluaciones</p>

        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Mis cuestionarios
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Retoma una evaluación o descubre lo que ya has aprendido.
        </p>
      </header>

      <section
        aria-label="Estadísticas de cuestionarios"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {stats.map((stat) => (
          <article key={stat.label} className="workspace-panel workspace-library-stat">
            <p className="text-sm text-muted">{stat.label}</p>

            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      <section aria-labelledby="quizzes-list-title">
        <div className="mb-5">
          <h2 id="quizzes-list-title" className="font-display text-lg font-semibold">
            Todas las evaluaciones
          </h2>

          <p className="mt-2 text-sm text-muted">
            Cuestionarios disponibles para estudiar nuevamente.
          </p>
        </div>

        {quizzes.length === 0 ? (
          <div className="workspace-panel p-8 text-center">
            <h3 className="font-display text-xl font-semibold">Todavía no tienes cuestionarios</h3>

            <p className="mt-3 text-sm leading-6 text-muted">
              Abre uno de tus documentos y genera tu primera evaluación con inteligencia artificial.
            </p>

            <Link
              href="/dashboard/documents"
              className="workspace-action workspace-action-primary mt-6"
            >
              Ir a mis documentos
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {quizzes.map((quiz) => (
              <article
                key={quiz.id}
                className="workspace-panel flex flex-col justify-between gap-5 p-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-accent-soft/50 px-2.5 py-1.5 text-xs font-medium text-accent-foreground">
                      <DashboardIcon name="quiz" className="size-3.5" />
                      {quiz.question_count} {quiz.question_count === 1 ? "pregunta" : "preguntas"}
                    </span>

                    <span className="text-xs text-muted">{formatDate(quiz.created_at)}</span>
                  </div>

                  <h3 className="mt-4 break-words text-base font-semibold leading-6 tracking-tight">
                    {quiz.title}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-input-border pt-5">
                  <Link
                    href={`/dashboard/quizzes/${encodeURIComponent(quiz.id)}`}
                    className="workspace-action workspace-action-primary"
                  >
                    Resolver
                    <DashboardIcon name="arrow" className="size-3.5" />
                  </Link>

                  <Link
                    href={`/dashboard/quizzes/${encodeURIComponent(quiz.id)}/attempts`}
                    className="workspace-action"
                  >
                    Ver historial
                  </Link>

                  <Link
                    href={`/dashboard/documents/${encodeURIComponent(quiz.document_id)}`}
                    className="workspace-action"
                  >
                    Ver documento
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardReveal>
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

        const payload: unknown = await response.json().catch(() => null);

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          await redirectExpiredSession();
          return;
        }

        if (!response.ok) {
          throw new Error(`No se pudieron consultar los cuestionarios (HTTP ${response.status}).`);
        }

        if (
          typeof payload !== "object" ||
          payload === null ||
          !("quizzes" in payload) ||
          !Array.isArray(payload.quizzes) ||
          !payload.quizzes.every(isQuiz)
        ) {
          throw new Error("El servidor devolvió un listado de cuestionarios inesperado.");
        }

        const quizzes = [...payload.quizzes].sort((a, b) =>
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
              caught instanceof Error ? caught.message : "No se pudieron cargar los cuestionarios.",
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
      <>
        {state.status === "loading" ? (
          <QuizzesSkeleton />
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
              className="workspace-action workspace-action-primary mt-6"
            >
              Reintentar
            </button>
          </section>
        ) : (
          <QuizzesContent quizzes={state.quizzes} />
        )}
      </>
    </main>
  );
}
