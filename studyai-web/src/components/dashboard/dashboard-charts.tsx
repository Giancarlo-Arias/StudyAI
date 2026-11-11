"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { DashboardDocument, DashboardProgress } from "@/types/dashboard";
import { DashboardIcon } from "./dashboard-icon";
import {
  AnimatedMetric,
  DashboardReveal,
  useDashboardReducedMotion,
  useRevealReady,
} from "./dashboard-reveal";

type ResultPoint = {
  id: string;
  quizId: string;
  title: string;
  score: number;
  correct: number;
  total: number;
  date: string;
  label: string;
};

const scoreFormatter = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 });

function score(value: number | null) {
  return value === null ? "—" : scoreFormatter.format(value) + " %";
}

function date(value: string, full = false) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return parsed.toLocaleDateString("es-CR", {
    day: "numeric",
    month: full ? "long" : "short",
    timeZone: "America/Costa_Rica",
  });
}

function ChartLegendHelp({ children, explanation }: { children: ReactNode; explanation: string }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className="workspace-chart-help"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={() => {
        if (!ref.current?.contains(document.activeElement)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(true)}
        className="workspace-chart-help-trigger"
      >
        {children}
        <span aria-hidden="true" className="workspace-chart-help-mark">
          ?
        </span>
      </button>
      {open && (
        <span id={id} role="tooltip" className="workspace-chart-help-tooltip">
          {explanation}
        </span>
      )}
    </span>
  );
}

function ResultTooltip({
  active,
  payload,
}: Pick<TooltipContentProps<number, string>, "active" | "payload">) {
  const point = payload?.[0]?.payload as ResultPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="workspace-chart-tooltip">
      <p className="text-[10px] text-muted">{date(point.date, true)}</p>
      <p className="mt-1.5 max-w-52 break-words text-xs font-medium">{point.title}</p>
      <div className="mt-3 flex items-baseline justify-between gap-5">
        <strong className="text-2xl font-semibold tracking-tight tabular-nums">
          {score(point.score)}
        </strong>
        <span className="text-[10px] text-muted">
          {point.correct}/{point.total} correctas
        </span>
      </div>
    </div>
  );
}

export function DashboardCharts({
  progress,
  documents,
}: {
  progress: DashboardProgress;
  documents: DashboardDocument[];
}) {
  const id = useId().replace(/:/g, "");
  const reducedMotion = useDashboardReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const ready = useRevealReady(rootRef);
  const attempts: ResultPoint[] = [...progress.recent_attempts]
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
    .map((attempt) => ({
      id: attempt.attempt_id,
      quizId: attempt.quiz_id,
      title: attempt.quiz_title,
      score: Math.min(100, Math.max(0, attempt.score_percent)),
      correct: attempt.correct_count,
      total: attempt.question_count,
      date: attempt.submitted_at,
      label: date(attempt.submitted_at),
    }));
  const completed = Math.max(0, Math.min(progress.total_quizzes, progress.quizzes_completed));
  const pending = Math.max(0, progress.total_quizzes - completed);
  const percentage =
    progress.total_quizzes > 0 ? Math.round((completed / progress.total_quizzes) * 100) : 0;
  const composition =
    progress.total_quizzes > 0
      ? [
          { name: "Completados", value: completed, fill: "var(--chart-primary)" },
          { name: "Pendientes", value: pending, fill: "var(--surface-soft)" },
        ]
      : [{ name: "Sin cuestionarios", value: 1, fill: "var(--surface-soft)" }];
  const scoredDocuments = documents
    .filter((document) => document.average_score_percent !== null)
    .sort((a, b) => (b.average_score_percent ?? 0) - (a.average_score_percent ?? 0));
  const hasFullHistory = attempts.length >= progress.total_attempts;

  return (
    <div ref={rootRef} data-charts-ready={ready}>
      <DashboardReveal className="workspace-analytics">
        <div className="workspace-chart-grid">
          <section
            data-reveal=""
            className="workspace-panel workspace-chart-panel overflow-hidden"
            aria-labelledby={id + "-evolution"}
          >
            <div className="workspace-panel-heading">
              <div>
                <h3 id={id + "-evolution"} className="workspace-panel-title">
                  Evolución de resultados
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {hasFullHistory
                    ? "Tu aprendizaje, intento a intento."
                    : "Tus intentos recientes y el promedio general."}
                </p>
              </div>
              <span className="workspace-chart-pill">
                <DashboardIcon name="clock" className="size-3" />
                {hasFullHistory
                  ? `${attempts.length} ${attempts.length === 1 ? "intento" : "intentos"}`
                  : `${attempts.length} de ${progress.total_attempts} intentos`}
              </span>
            </div>
            {attempts.length === 0 ? (
              <div className="workspace-empty !min-h-64">
                <DashboardIcon name="chart" className="size-7 text-accent-foreground" />
                <p className="text-sm font-medium">Aquí empieza tu evolución</p>
                <p className="max-w-64 text-xs leading-6 text-muted">
                  Completa un cuestionario para descubrir tus primeros resultados.
                </p>
                <Link href="/dashboard/quizzes" className="workspace-section-link">
                  Ver cuestionarios
                  <DashboardIcon name="arrow" className="size-3.5" />
                </Link>
              </div>
            ) : (
              <>
                <div className="workspace-chart-stat">
                  <strong>{score(progress.average_score_percent)}</strong>
                  <span className="text-[11px] text-muted">promedio general</span>
                  <div className="ml-auto flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    <ChartLegendHelp explanation="La curva muestra el porcentaje de respuestas correctas de cada intento, ordenado por fecha. Toca un punto o pasa el cursor para ver su detalle.">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-[var(--chart-primary)]"
                      />
                      Cada intento
                    </ChartLegendHelp>
                    <ChartLegendHelp explanation="La línea discontinua marca el promedio general que informa tu historial. Sirve como referencia para comparar los resultados de cada intento.">
                      <span
                        aria-hidden="true"
                        className="w-3 border-t border-dashed border-muted"
                      />
                      Promedio
                    </ChartLegendHelp>
                  </div>
                </div>
                <div className="workspace-evolution-plot px-2 pb-1 sm:px-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>
                    <AreaChart
                      data={attempts}
                      margin={{ top: 12, right: 16, left: -20, bottom: 0 }}
                      accessibilityLayer
                    >
                      <defs>
                        <linearGradient id={id + "-area"} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-primary)" stopOpacity={0.24} />
                          <stop offset="95%" stopColor="var(--chart-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        stroke="var(--chart-grid)"
                        vertical={false}
                        strokeDasharray="3 5"
                      />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--muted)", fontSize: 10 }}
                        tickMargin={10}
                        minTickGap={28}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--muted)", fontSize: 10 }}
                        tickFormatter={(value: number) => value + "%"}
                        width={52}
                      />
                      {progress.average_score_percent !== null && (
                        <ReferenceLine
                          y={progress.average_score_percent}
                          stroke="var(--muted)"
                          strokeDasharray="4 5"
                          strokeOpacity={0.5}
                        />
                      )}
                      <Tooltip
                        content={(props) => <ResultTooltip {...props} />}
                        cursor={{
                          stroke: "var(--chart-primary)",
                          strokeWidth: 1,
                          strokeDasharray: "3 4",
                          strokeOpacity: 0.5,
                        }}
                      />
                      {ready && (
                        <Area
                          type="monotoneX"
                          dataKey="score"
                          name="Resultado"
                          stroke="var(--chart-primary)"
                          strokeWidth={2.5}
                          fill={"url(#" + id + "-area)"}
                          activeDot={{
                            r: 5,
                            fill: "var(--chart-primary)",
                            stroke: "var(--surface)",
                            strokeWidth: 3,
                          }}
                          dot={
                            attempts.length < 7
                              ? {
                                  r: 3,
                                  fill: "var(--chart-primary)",
                                  stroke: "var(--surface)",
                                  strokeWidth: 2,
                                }
                              : false
                          }
                          isAnimationActive={!reducedMotion}
                          animationBegin={0}
                          animationDuration={700}
                          animationEasing="ease-out"
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <details className="mx-5 border-t border-border/50 pb-2 text-[11px]">
                  <summary className="min-h-9 w-fit cursor-pointer py-2.5 text-muted">
                    Explorar los {attempts.length} resultados
                  </summary>
                  <div className="max-h-52 overflow-auto pb-2">
                    <table className="w-full text-left text-[11px]">
                      <caption className="sr-only">Datos de la gráfica de evolución</caption>
                      <thead>
                        <tr className="border-b border-border text-muted">
                          <th scope="col" className="py-2 pr-3 font-medium">
                            Cuestionario
                          </th>
                          <th scope="col" className="py-2 pr-3 font-medium">
                            Fecha
                          </th>
                          <th scope="col" className="py-2 text-right font-medium">
                            Resultado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {attempts.map((point) => (
                          <tr key={point.id} className="border-b border-border/50 last:border-0">
                            <th scope="row" className="max-w-56 break-words py-2 pr-3 font-medium">
                              {point.title}
                            </th>
                            <td className="whitespace-nowrap py-2 pr-3 text-muted">
                              {point.label}
                            </td>
                            <td className="py-2 text-right tabular-nums">{score(point.score)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </section>

          <section
            data-reveal=""
            className="workspace-panel workspace-progress-panel overflow-hidden"
            aria-labelledby={id + "-completion"}
          >
            <div className="workspace-panel-heading">
              <div>
                <h3 id={id + "-completion"} className="workspace-panel-title">
                  Tu progreso
                </h3>
                <p className="mt-1 text-xs text-muted">Cuestionarios completados</p>
              </div>
              <span className="workspace-panel-symbol">
                <DashboardIcon name="target" className="size-4" />
              </span>
            </div>
            <div
              className="workspace-completion-visual"
              role="img"
              aria-label={
                completed + " de " + progress.total_quizzes + " cuestionarios completados"
              }
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={60}>
                <PieChart>
                  {ready && (
                    <Pie
                      data={composition}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={57}
                      outerRadius={72}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={completed > 0 && pending > 0 ? 5 : 0}
                      cornerRadius={7}
                      stroke="none"
                      isAnimationActive={!reducedMotion}
                      animationBegin={60}
                      animationDuration={750}
                      animationEasing="ease-out"
                    />
                  )}
                </PieChart>
              </ResponsiveContainer>
              <div className="workspace-completion-center">
                <strong>
                  {percentage}
                  <span className="!text-xl !text-foreground">%</span>
                </strong>
                <span>completado</span>
              </div>
            </div>
            <div className="mx-5 grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="size-1.5 rounded-full bg-[var(--chart-primary)]" />
                  Completados
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{completed}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="size-1.5 rounded-full bg-muted/40" />
                  Pendientes
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{pending}</p>
              </div>
            </div>
            <div className="px-5 pt-3 pb-4">
              <Link
                href={progress.total_quizzes > 0 ? "/dashboard/quizzes" : "/dashboard/documents"}
                className="workspace-action workspace-action-primary workspace-study-action w-full"
              >
                Continuar estudiando
                <DashboardIcon name="arrow" className="size-3.5" />
              </Link>
            </div>
          </section>
        </div>

        <div className="workspace-chart-row">
          <section
            data-reveal=""
            className="workspace-panel workspace-ranking-panel overflow-hidden"
            aria-labelledby={id + "-documents"}
          >
            <div className="workspace-panel-heading">
              <div>
                <h3 id={id + "-documents"} className="workspace-panel-title">
                  Rendimiento por documento
                </h3>
                <p className="mt-1 text-xs text-muted">
                  Promedio de tus resultados · escala de 100
                </p>
              </div>
              <span className="workspace-panel-symbol">
                <DashboardIcon name="document" className="size-4" />
              </span>
            </div>
            {scoredDocuments.length === 0 ? (
              <div className="workspace-empty">
                <DashboardIcon name="document" className="size-6 text-muted" />
                <p className="text-sm font-medium">Dale vida a tus documentos</p>
                <p className="max-w-64 text-xs leading-6 text-muted">
                  Aquí podrás comparar tus resultados después de completar un cuestionario.
                </p>
              </div>
            ) : (
              <ul className="pb-2">
                {scoredDocuments.map((document, index) => (
                  <li key={document.document_id} className="workspace-ranking-row">
                    <span className="w-4 shrink-0 text-[10px] tabular-nums text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <Link
                          href={"/dashboard/documents/" + encodeURIComponent(document.document_id)}
                          className="min-w-0 truncate text-xs font-medium underline-offset-4 hover:text-accent-foreground hover:underline"
                          title={document.filename}
                        >
                          {document.filename}
                        </Link>
                        <span className="shrink-0 text-xs font-semibold tabular-nums">
                          {score(document.average_score_percent)}
                        </span>
                      </div>
                      <span
                        className="workspace-ranking-track"
                        role="meter"
                        aria-label={"Promedio de " + document.filename}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={document.average_score_percent ?? 0}
                      >
                        <span
                          className={"workspace-ranking-fill" + (ready ? " is-ready" : "")}
                          style={
                            {
                              "--bar-scale":
                                Math.min(100, Math.max(0, document.average_score_percent ?? 0)) /
                                100,
                              transform:
                                "scaleX(" +
                                Math.min(100, Math.max(0, document.average_score_percent ?? 0)) /
                                  100 +
                                ")",
                            } as CSSProperties
                          }
                        />
                      </span>
                      <p className="mt-1.5 text-[10px] text-muted">
                        {document.total_attempts}{" "}
                        {document.total_attempts === 1 ? "intento" : "intentos"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="workspace-panel workspace-activity-panel overflow-hidden"
            aria-labelledby={id + "-recent"}
          >
            <DashboardReveal key={attempts.map((attempt) => attempt.id).join(":")}>
              <div data-reveal="text" className="workspace-panel-heading">
                <div>
                  <h3 id={id + "-recent"} className="workspace-panel-title">
                    Actividad reciente
                  </h3>
                  <p className="mt-1 text-xs text-muted">Un paso más en tu aprendizaje.</p>
                </div>
                <Link href="/dashboard/quizzes" className="workspace-section-link !min-h-6">
                  Ver todo
                  <DashboardIcon name="arrow" className="size-3" />
                </Link>
              </div>
              {attempts.length === 0 ? (
                <div data-reveal="" className="workspace-empty">
                  <DashboardIcon name="clock" className="size-6 text-muted" />
                  <p className="text-sm font-medium">Tu primer intento te espera</p>
                  <p className="max-w-64 text-xs leading-6 text-muted">
                    Resuelve un cuestionario y empieza a construir tu historial.
                  </p>
                </div>
              ) : (
                <ul className="workspace-activity-list pb-2">
                  {[...attempts]
                    .reverse()
                    .slice(0, 4)
                    .map((point) => (
                      <li key={point.id}>
                        <Link
                          href={
                            "/dashboard/quizzes/" +
                            encodeURIComponent(point.quizId) +
                            "/attempts/" +
                            encodeURIComponent(point.id)
                          }
                          className="workspace-activity-link"
                        >
                          <span
                            data-reveal="fade"
                            className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft/70 text-accent-foreground"
                          >
                            <DashboardIcon name="check" className="size-3.5" />
                          </span>
                          <div data-reveal="text" className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[13px] font-medium leading-5">
                              {point.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              {point.correct} de {point.total} correctas · {point.label}
                            </p>
                          </div>
                          <span data-reveal="fade" className="text-xs font-semibold tabular-nums">
                            <span className="sr-only">{score(point.score)}</span>
                            <AnimatedMetric value={point.score} format={score} />
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </DashboardReveal>
          </section>
        </div>
      </DashboardReveal>
    </div>
  );
}
