"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { addTransitionType, startTransition, useState, ViewTransition } from "react";
import type { DashboardResponse } from "@/types/dashboard";
import { AchievementsSection } from "./achievements-section";
import { AnimatedMetric, DashboardReveal } from "./dashboard-reveal";
import { DashboardIcon, type DashboardIconName } from "./dashboard-icon";

const DashboardCharts = dynamic(
  () => import("./dashboard-charts").then((module) => module.DashboardCharts),
  {
    loading: () => (
      <div className="workspace-chart-placeholder" role="status" aria-label="Preparando gráficas">
        <div className="workspace-loading-pulse" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <span className="text-xs text-muted">Preparando tus gráficas</span>
      </div>
    ),
  },
);

const scoreFormatter = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 });
const countFormatter = new Intl.NumberFormat("es-CR");
const compactCountFormatter = new Intl.NumberFormat("es-CR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatScore(value: number | null) {
  return value === null ? "—" : `${scoreFormatter.format(value)} %`;
}

function formatCount(value: number) {
  return (value >= 10000 ? compactCountFormatter : countFormatter).format(value);
}

function formatMetricCount(value: number | null) {
  return formatCount(Math.round(value ?? 0));
}

function formatDate(value: string | null) {
  if (!value) return "Sin actividad todavía";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Fecha no disponible"
    : new Intl.DateTimeFormat("es-CR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Costa_Rica",
      }).format(date);
}

export function DashboardOverview({
  dashboard,
  fullName,
}: {
  dashboard: DashboardResponse;
  fullName: string;
}) {
  const [view, setView] = useState<"summary" | "charts">("charts");
  const { progress, documents, achievements } = dashboard;
  const latestAttempt = progress.recent_attempts.reduce<
    DashboardResponse["progress"]["recent_attempts"][number] | null
  >((latest, attempt) => {
    if (!latest || new Date(attempt.submitted_at).getTime() > new Date(latest.submitted_at).getTime()) {
      return attempt;
    }
    return latest;
  }, null);
  const latestScore = latestAttempt?.score_percent ?? null;
  const completed = Math.min(progress.total_quizzes, Math.max(0, progress.quizzes_completed));
  const pending = Math.max(0, progress.total_quizzes - completed);
  const firstName = fullName.trim().split(/\s+/)[0] || "estudiante";
  const metrics: {
    label: string;
    value: string;
    rawValue: number | null;
    format: (value: number | null) => string;
    exactValue?: string;
    icon: DashboardIconName;
  }[] = [
    {
      label: "Último intento",
      value: formatScore(latestScore),
      rawValue: latestScore,
      format: formatScore,
      icon: "chart",
    },
    {
      label: "Cuestionarios",
      value: formatCount(progress.total_quizzes),
      rawValue: progress.total_quizzes,
      format: formatMetricCount,
      exactValue: progress.total_quizzes.toLocaleString("es-CR"),
      icon: "quiz",
    },
    {
      label: "Completados",
      value: formatCount(progress.quizzes_completed),
      rawValue: progress.quizzes_completed,
      format: formatMetricCount,
      exactValue: progress.quizzes_completed.toLocaleString("es-CR"),
      icon: "check",
    },
    {
      label: "Intentos",
      value: formatCount(progress.total_attempts),
      rawValue: progress.total_attempts,
      format: formatMetricCount,
      exactValue: progress.total_attempts.toLocaleString("es-CR"),
      icon: "clock",
    },
    {
      label: "Mejor resultado",
      value: formatScore(progress.best_score_percent),
      rawValue: progress.best_score_percent,
      format: formatScore,
      icon: "trophy",
    },
  ];

  return (
    <main>
      <DashboardReveal>
        <header
          data-reveal="text"
          className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"
        >
          <div className="min-w-0">
            <h1 className="break-words font-display text-2xl font-semibold leading-tight tracking-[-.035em] sm:text-[1.75rem]">
              Hola, {firstName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Todo lo que estás aprendiendo, en un solo lugar.
            </p>
          </div>
          <Link
            href={progress.total_quizzes > 0 ? "/dashboard/quizzes" : "/dashboard/documents"}
            className="workspace-action workspace-action-primary workspace-study-action w-fit shrink-0"
          >
            <DashboardIcon name="document" className="size-[18px]" />
            Continuar estudiando
            <DashboardIcon name="arrow" className="size-4" />
          </Link>
        </header>

        <section aria-label="Tu aprendizaje en cifras" className="workspace-metrics">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              data-reveal=""
              className="workspace-panel workspace-glass workspace-metric"
            >
              <div className="workspace-metric-label">
                <h2 title={metric.label}>{metric.label}</h2>
                <span className="workspace-metric-icon">
                  <DashboardIcon name={metric.icon} className="size-3.5" />
                </span>
              </div>
              <p
                className="workspace-metric-value"
                title={metric.exactValue}
                aria-label={metric.label + ": " + (metric.exactValue ?? metric.value)}
              >
                <AnimatedMetric value={metric.rawValue} format={metric.format} />
              </p>
            </article>
          ))}
        </section>

        <div data-reveal="text" className="workspace-data-toolbar">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Tu aprendizaje</h2>
            <p className="mt-1 text-sm text-muted">
              {progress.total_quizzes === 0
                ? "Empieza con un documento y dale forma a tu aprendizaje."
                : pending > 0
                  ? pending +
                    (pending === 1 ? " cuestionario por completar" : " cuestionarios por completar")
                  : "Has completado todos tus cuestionarios."}
            </p>
          </div>
          <div
            className="workspace-segment workspace-data-switch w-fit"
            role="group"
            aria-label="Presentación del dashboard"
          >
            {(
              [
                { id: "summary", label: "Resumen", icon: "overview" },
                { id: "charts", label: "Gráficas", icon: "chart" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                className="workspace-segment-button"
                aria-pressed={view === option.id}
                aria-controls="dashboard-study-content"
                onClick={(event) => {
                  if (view === option.id) return;
                  if (event.detail === 0) setView(option.id);
                  else
                    startTransition(() => {
                      addTransitionType("dashboard-display");
                      setView(option.id);
                    });
                }}
              >
                {view === option.id && (
                  <span className="workspace-segment-lens" aria-hidden="true" />
                )}
                <DashboardIcon name={option.icon} className="size-4" />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <ViewTransition default="none" update="dashboard-display">
          <div id="dashboard-study-content">
            {view === "charts" ? (
              <DashboardCharts progress={progress} documents={documents} />
            ) : (
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <section
                  data-reveal=""
                  className="workspace-panel overflow-hidden"
                  aria-labelledby="study-documents-title"
                >
                  <div className="workspace-panel-heading border-b border-border">
                    <div>
                      <h3 id="study-documents-title" className="workspace-panel-title">
                        Tus documentos
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        El punto de partida de tu aprendizaje
                      </p>
                    </div>
                    <Link href="/dashboard/documents" className="workspace-section-link">
                      Biblioteca
                      <DashboardIcon name="arrow" className="size-4" />
                    </Link>
                  </div>
                  {documents.length === 0 ? (
                    <div className="workspace-empty">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground">
                        <DashboardIcon name="document" />
                      </span>
                      <p className="font-medium">Empieza con un documento</p>
                      <p className="max-w-xs text-sm leading-6 text-muted">
                        Sube un PDF y conviértelo en una nueva oportunidad para aprender.
                      </p>
                      <Link href="/dashboard/documents" className="workspace-section-link">
                        Ir a mis documentos
                        <DashboardIcon name="arrow" className="size-4" />
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {documents.map((document) => (
                        <li key={document.document_id} className="p-4 sm:px-5">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-muted">
                              <DashboardIcon name="document" className="size-[18px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/dashboard/documents/${encodeURIComponent(document.document_id)}`}
                                className="block min-h-11 break-words text-sm font-semibold underline-offset-4 hover:text-accent-foreground hover:underline"
                              >
                                {document.filename}
                              </Link>
                              <p className="mt-1 text-xs text-muted">
                                {formatDate(document.last_attempt_at)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold tabular-nums">
                                {formatScore(document.average_score_percent)}
                              </p>
                              <p className="mt-1 text-[11px] text-muted">promedio</p>
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                            <span>{document.total_quizzes} cuestionarios</span>
                            <span>{document.quizzes_completed} completados</span>
                            <span>{document.total_attempts} intentos</span>
                            <span className="ml-auto">
                              Mejor:{" "}
                              <span className="font-medium text-foreground">
                                {formatScore(document.best_score_percent)}
                              </span>
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section
                  data-reveal=""
                  className="workspace-panel overflow-hidden"
                  aria-labelledby="recent-study-title"
                >
                  <div className="workspace-panel-heading border-b border-border">
                    <div>
                      <h3 id="recent-study-title" className="workspace-panel-title">
                        Últimos resultados
                      </h3>
                      <p className="mt-1 text-xs text-muted">Cada intento cuenta</p>
                    </div>
                    <DashboardIcon name="clock" className="mt-1 size-[18px] text-muted" />
                  </div>
                  {progress.recent_attempts.length === 0 ? (
                    <div className="workspace-empty">
                      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent-foreground">
                        <DashboardIcon name="quiz" />
                      </span>
                      <p className="font-medium">Tu primer resultado te espera</p>
                      <p className="max-w-xs text-sm leading-6 text-muted">
                        Resuelve un cuestionario para empezar a ver tus avances.
                      </p>
                      <Link href="/dashboard/quizzes" className="workspace-section-link">
                        Ver cuestionarios
                        <DashboardIcon name="arrow" className="size-4" />
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {progress.recent_attempts.map((attempt) => (
                        <li key={attempt.attempt_id}>
                          <Link
                            href={`/dashboard/quizzes/${encodeURIComponent(attempt.quiz_id)}/attempts/${encodeURIComponent(attempt.attempt_id)}`}
                            className="group flex items-start gap-3 p-4 transition-colors hover:bg-surface-soft sm:px-5"
                          >
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-foreground">
                              <DashboardIcon name="check" className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="break-words text-sm font-medium group-hover:text-accent-foreground">
                                {attempt.quiz_title}
                              </h4>
                              <p className="mt-1 text-xs leading-5 text-muted">
                                {attempt.correct_count} de {attempt.question_count} correctas ·{" "}
                                {formatDate(attempt.submitted_at)}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-lg bg-surface-soft px-2 py-1 text-xs font-semibold tabular-nums">
                              {formatScore(attempt.score_percent)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </div>
        </ViewTransition>

        <ViewTransition default="none" update="workspace-follow">
          <AchievementsSection achievements={achievements} />
        </ViewTransition>
      </DashboardReveal>
    </main>
  );
}
