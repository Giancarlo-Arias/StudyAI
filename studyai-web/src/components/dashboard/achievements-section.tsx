import type { DashboardAchievement } from "@/types/dashboard";
import { DashboardIcon } from "./dashboard-icon";
import { DashboardReveal } from "./dashboard-reveal";

interface AchievementsSectionProps {
  achievements: DashboardAchievement[];
}

function formatUnlockDate(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeZone: "America/Costa_Rica",
  }).format(date);
}

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  return (
    <DashboardReveal className="mt-6" containerEntrance>
      <section aria-labelledby="achievements-title">
        <div data-reveal="text" className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="achievements-title" className="text-lg font-semibold tracking-tight">
              Mis logros
            </h2>
            <p className="mt-1 text-sm text-muted">Pequeños pasos que hacen la diferencia.</p>
          </div>
          {achievements.length > 0 && (
            <p className="text-xs text-muted">
              <span className="font-semibold text-foreground">
                {achievements.filter((item) => item.unlocked).length}
              </span>{" "}
              de {achievements.length} desbloqueados
            </p>
          )}
        </div>

        {achievements.length === 0 ? (
          <div
            data-reveal="container"
            className="workspace-panel mt-5 p-8 text-center text-sm text-muted"
          >
            Todavía no hay logros disponibles.
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {achievements.map((achievement) => {
              const percentage = achievement.unlocked
                ? 100
                : Math.min(
                    100,
                    Math.max(0, (achievement.current / Math.max(achievement.target, 1)) * 100),
                  );

              const unlockedDate = formatUnlockDate(achievement.unlocked_at);

              return (
                <article
                  data-reveal="container"
                  key={achievement.code}
                  data-unlocked={achievement.unlocked}
                  className="workspace-panel workspace-achievement flex flex-col p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${achievement.unlocked ? "bg-accent-soft text-accent-foreground" : "bg-surface-soft text-muted"}`}
                    >
                      <DashboardIcon
                        name={achievement.unlocked ? "trophy" : "lock"}
                        className="size-5"
                      />
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        achievement.unlocked
                          ? "bg-accent-soft text-accent-foreground"
                          : "bg-surface-soft text-muted"
                      }`}
                    >
                      {achievement.unlocked ? "Desbloqueado" : "En progreso"}
                    </span>
                  </div>

                  <h3 className="mt-4 text-sm font-semibold">{achievement.title}</h3>
                  <p className="mt-2 min-h-10 flex-1 text-xs leading-5 text-muted">
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
                    className="workspace-progress mt-2"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--chart-primary)]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {achievement.unlocked && unlockedDate && (
                    <p className="mt-4 text-xs text-muted">Desbloqueado el {unlockedDate}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </DashboardReveal>
  );
}
