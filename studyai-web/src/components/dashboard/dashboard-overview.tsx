"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  addTransitionType,
  Fragment,
  startTransition,
  useState,
  useSyncExternalStore,
  ViewTransition,
  type ReactNode,
} from "react";
import type { DashboardResponse } from "@/types/dashboard";
import { AchievementsSection } from "./achievements-section";
import { AnimatedMetric, DashboardReveal } from "./dashboard-reveal";
import { DashboardIcon, type DashboardIconName } from "./dashboard-icon";

const DashboardCharts = dynamic(
  () => import("./dashboard-charts").then((module) => module.DashboardCharts),
  {
    loading: () => (
      <div role="status" aria-label="Preparando gráficas">
        <div
          className="workspace-analytics animate-pulse motion-reduce:animate-none"
          aria-hidden="true"
        >
          <div className="workspace-chart-grid">
            <div className="workspace-panel workspace-chart-skeleton workspace-chart-skeleton--evolution">
              <div className="h-4 w-40 max-w-full rounded-md bg-surface-soft" />
              <div className="mt-3 h-3 w-48 max-w-full rounded-md bg-surface-soft" />
              <div className="mt-8 h-7 w-24 rounded-lg bg-surface-soft" />
              <div className="mt-8 h-40 rounded-xl bg-surface-soft/50" />
            </div>
            <div className="workspace-panel workspace-chart-skeleton workspace-chart-skeleton--progress">
              <div className="h-4 w-32 max-w-full rounded-md bg-surface-soft" />
              <div className="mx-auto mt-10 size-32 rounded-full border-[14px] border-surface-soft" />
            </div>
          </div>
          <div className="workspace-chart-row">
            {["documents", "activity"].map((item) => (
              <div
                key={item}
                className={`workspace-panel workspace-chart-skeleton ${item === "activity" ? "workspace-activity-panel" : "workspace-ranking-panel"}`}
              >
                <div className="h-4 w-40 max-w-full rounded-md bg-surface-soft" />
                <div className="mt-7 space-y-4">
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="h-10 rounded-lg bg-surface-soft/60" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">Preparando tus gráficas</span>
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

const defaultOrder = "metrics,study,achievements";
const sectionLabels = {
  metrics: "Indicadores",
  study: "Tu aprendizaje",
  achievements: "Mis logros",
} as const;
type DashboardSection = keyof typeof sectionLabels;

function subscribeOrder(callback: () => void) {
  window.addEventListener("studyai-dashboard-order", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("studyai-dashboard-order", callback);
    window.removeEventListener("storage", callback);
  };
}

function getOrder() {
  try {
    const value = localStorage.getItem("studyai-dashboard-order");
    const items = value?.split(",") ?? [];
    return items.length === 3 &&
      new Set(items).size === 3 &&
      items.every((item) => Object.prototype.hasOwnProperty.call(sectionLabels, item))
      ? items.join(",")
      : defaultOrder;
  } catch {
    return defaultOrder;
  }
}

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
  const order = useSyncExternalStore(subscribeOrder, getOrder, () => defaultOrder).split(
    ",",
  ) as DashboardSection[];
  function moveSection(section: DashboardSection, direction: -1 | 1) {
    const next = [...order];
    const index = next.indexOf(section);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    try {
      localStorage.setItem("studyai-dashboard-order", next.join(","));
      window.dispatchEvent(new Event("studyai-dashboard-order"));
    } catch {
      return;
    }
  }
  const { progress, documents, achievements } = dashboard;
  const milestones = [
    {
      code: "web_25_attempts",
      title: "Hábito de estudio",
      description: "Completa 25 intentos de cuestionarios.",
      current: Math.min(progress.total_attempts, 25),
      target: 25,
      unlocked: progress.total_attempts >= 25,
      unlocked_at: null,
    },
    {
      code: "web_10_quizzes",
      title: "Aprendiz en marcha",
      description: "Completa 10 cuestionarios diferentes.",
      current: Math.min(progress.quizzes_completed, 10),
      target: 10,
      unlocked: progress.quizzes_completed >= 10,
      unlocked_at: null,
    },
  ];
  const latestAttempt = progress.recent_attempts.reduce<
    DashboardResponse["progress"]["recent_attempts"][number] | null
  >((latest, attempt) => {
    if (
      !latest ||
      new Date(attempt.submitted_at).getTime() > new Date(latest.submitted_at).getTime()
    ) {
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

  const sections: Record<DashboardSection, ReactNode> = {
    metrics: (
      <section aria-label="Tu aprendizaje en cifras" className="workspace-metrics">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            data-reveal="container"
            className="workspace-panel workspace-glass workspace-metric"
          >
            <div className="workspace-metric-label">
              <h2 data-reveal-content="" title={metric.label}>
                {metric.label}
              </h2>
              <span data-reveal-content="" className="workspace-metric-icon">
                <DashboardIcon name={metric.icon} className="size-3.5" />
              </span>
            </div>
            <p
              data-reveal-content=""
              className="workspace-metric-value"
              title={metric.exactValue}
              aria-label={metric.label + ": " + (metric.exactValue ?? metric.value)}
            >
              <AnimatedMetric value={metric.rawValue} format={metric.format} />
            </p>
          </article>
        ))}
      </section>
    ),
    study: (
      <>
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

        <ViewTransition
          default="none"
          update={{ "dashboard-display": "dashboard-display", default: "none" }}
        >
          <div id="dashboard-study-content">
            {view === "charts" ? (
              <DashboardCharts progress={progress} documents={documents} />
            ) : (
              <DashboardReveal
                containerEntrance
                className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
              >
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
              </DashboardReveal>
            )}
          </div>
        </ViewTransition>
      </>
    ),
    achievements: (
      <ViewTransition
        default="none"
        update={{ "dashboard-display": "workspace-follow", default: "none" }}
      >
        <div>
          <AchievementsSection key={view} achievements={[...achievements, ...milestones]} />
        </div>
      </ViewTransition>
    ),
  };

  return (
    <main>
      <DashboardReveal containerEntrance className="workspace-overview-layout">
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

        <details className="workspace-order-settings">
          <summary>Organizar dashboard</summary>
          <p className="mt-2 text-xs text-muted">
            Elige el orden de las secciones en este navegador.
          </p>
          <ol className="mt-3 space-y-1">
            {order.map((section, index) => (
              <li key={section} className="workspace-order-row">
                <span>{sectionLabels[section]}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-disabled={index === 0}
                    onClick={() => moveSection(section, -1)}
                    aria-label={`Subir ${sectionLabels[section]}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-disabled={index === order.length - 1}
                    onClick={() => moveSection(section, 1)}
                    aria-label={`Bajar ${sectionLabels[section]}`}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </details>

        {order.map((section) => (
          <Fragment key={section}>{sections[section]}</Fragment>
        ))}
      </DashboardReveal>
    </main>
  );
}
