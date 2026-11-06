import type { DashboardAchievement } from "@/types/dashboard";

interface AchievementsSectionProps {
  achievements: DashboardAchievement[];
}

function formatUnlockDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
  }).format(date);
}

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  return (
    <section className="mt-10" aria-labelledby="achievements-title">
      <div>
        <h2 id="achievements-title" className="font-display text-xl font-semibold">
          Mis logros
        </h2>
        <p className="mt-2 text-sm text-muted">
          Desbloquea logros mientras avanzas en tu aprendizaje.
        </p>
      </div>

      {achievements.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-input-border bg-surface p-8 text-center text-sm text-muted">
          Todavía no hay logros disponibles.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {achievements.map((achievement) => {
            const percentage = achievement.unlocked
              ? 100
              : Math.min(100, Math.max(0, (achievement.current / Math.max(achievement.target, 1)) * 100));

            const unlockedDate = formatUnlockDate(achievement.unlocked_at);

            return (
              <article
                key={achievement.code}
                className="rounded-2xl border border-input-border bg-surface p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
                      aria-hidden="true">
                      <path d="M8 21h8m-4-4v4M7 3h10v8a5 5 0 0 1-10 0V3ZM7 5H4v3a4 4 0 0 0 4 4M17 5h3v3a4 4 0 0 1-4 4" />
                    </svg>
                  </div>

                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    achievement.unlocked
                      ? "bg-primary/10 text-primary"
                      : "bg-surface-soft text-muted"
                  }`}>
                    {achievement.unlocked ? "Desbloqueado" : "En progreso"}
                  </span>
                </div>

                <h3 className="mt-5 text-base font-semibold">{achievement.title}</h3>
                <p className="mt-2 min-h-10 text-sm leading-5 text-muted">
                  {achievement.description}
                </p>

                <div className="mt-5 flex items-center justify-between text-xs">
                  <span className="text-muted">Progreso</span>
                  <span className="font-medium">
                    {achievement.current} / {achievement.target}
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label={`Progreso de ${achievement.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(percentage)}
                  className="mt-2 h-2 overflow-hidden rounded-full bg-surface-soft"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {achievement.unlocked && unlockedDate && (
                  <p className="mt-4 text-xs text-muted">
                    Desbloqueado el {unlockedDate}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}