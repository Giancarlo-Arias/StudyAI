import { Suspense } from "react";
import { requireUser } from "@/lib/auth-server";
import { getDashboardData } from "@/lib/dashboard";
import { AchievementsSection } from "@/components/dashboard/achievements-section";
function formatScore(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin actividad";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
  }).format(date);
}

async function DashboardContent() {
  const user = await requireUser();
  const dashboard = await getDashboardData();

  const { progress, documents } = dashboard;
  const recentAttempts = progress.recent_attempts;

  const stats = [
    {
      label: "Cuestionarios",
      value: progress.total_quizzes.toString(),
    },
    {
      label: "Completados",
      value: progress.quizzes_completed.toString(),
    },
    {
      label: "Intentos realizados",
      value: progress.total_attempts.toString(),
    },
    {
      label: "Promedio académico",
      value: formatScore(progress.average_score_percent),
    },
    {
      label: "Mejor calificación",
      value: formatScore(progress.best_score_percent),
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <section>
        <p className="text-sm font-medium text-primary">Mi espacio de aprendizaje</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Hola, {user.full_name}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Consulta tus documentos, resultados y actividad de estudio.
        </p>
      </section>

      <section aria-label="Estadísticas generales" className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-input-border bg-surface p-5">
            <p className="text-sm text-muted">{stat.label}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{stat.value}</p>
          </article>
        ))}
      </section>

      <div className="mt-10 grid items-start gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="min-w-0 rounded-2xl border border-input-border bg-surface">
          <div className="border-b border-input-border px-5 py-5">
            <h2 className="font-display text-lg font-semibold">Mis documentos</h2>
            <p className="mt-1 text-sm text-muted">
              Progreso de los PDFs que has utilizado para estudiar.
            </p>
          </div>

          {documents.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              Todavía no tienes documentos registrados.
            </p>
          ) : (
            <div className="divide-y divide-input-border">
              {documents.map((document) => (
                <article key={document.document_id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6M8 13h8M8 17h8" />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-semibold">{document.filename}</h3>
                      <p className="mt-1 text-xs text-muted">
                        Última actividad: {formatDate(document.last_attempt_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted">Quizzes</p>
                      <p className="mt-1 text-base font-semibold">{document.total_quizzes}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted">Completados</p>
                      <p className="mt-1 text-base font-semibold">{document.quizzes_completed}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted">Intentos</p>
                      <p className="mt-1 text-base font-semibold">{document.total_attempts}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-input-border pt-4 text-xs">
                    <span className="text-muted">
                      Promedio: <strong className="font-semibold text-foreground">{formatScore(document.average_score_percent)}</strong>
                    </span>

                    <span className="text-muted">
                      Mejor nota: <strong className="font-semibold text-foreground">{formatScore(document.best_score_percent)}</strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-2xl border border-input-border bg-surface">
          <div className="border-b border-input-border px-5 py-5">
            <h2 className="font-display text-lg font-semibold">Actividad reciente</h2>
            <p className="mt-1 text-sm text-muted">
              Tus últimos intentos de evaluación.
            </p>
          </div>

          {recentAttempts.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              Todavía no has completado evaluaciones.
            </p>
          ) : (
            <div className="divide-y divide-input-border">
              {recentAttempts.map((attempt) => (
                <article key={attempt.attempt_id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-semibold">
                        {attempt.quiz_title}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {formatDate(attempt.submitted_at)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {formatScore(attempt.score_percent)}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-muted">
                    {attempt.correct_count} de {attempt.question_count} respuestas correctas
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      
      <AchievementsSection achievements={dashboard.achievements} />
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Cargando dashboard...</p>}>
      <DashboardContent />
    </Suspense>
  );
}