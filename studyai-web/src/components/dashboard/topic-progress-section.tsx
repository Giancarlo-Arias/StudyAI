
"use client";

import type { TopicProgress } from "@/types/dashboard";

const statusLabels: Record<TopicProgress["status"], string> = {
  insufficient_data: "Datos insuficientes",
  reinforce: "Necesita refuerzo",
  review: "Conviene repasar",
  strong: "Buen dominio",
};

const percentFormatter = new Intl.NumberFormat("es-CR", {
  maximumFractionDigits: 1,
});

function getAccuracy(topic: TopicProgress): number | null {
  if (topic.accuracy_percent === null || !Number.isFinite(topic.accuracy_percent)) {
    return null;
  }

  return Math.min(100, Math.max(0, topic.accuracy_percent));
}

export function TopicProgressSection({ topics }: { topics: TopicProgress[] }) {
  return (
    <section
      className="workspace-panel mt-5 overflow-hidden"
      aria-labelledby="topic-progress-title"
    >
      <div className="workspace-panel-heading border-b border-border">
        <div className="min-w-0">
          <h3 id="topic-progress-title" className="workspace-panel-title">
            Rendimiento por tema
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Identifica los temas que dominas y los que necesitas reforzar.
          </p>
        </div>

        {topics.length > 0 && (
          <span className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium tabular-nums text-muted">
            {topics.length} {topics.length === 1 ? "tema" : "temas"}
          </span>
        )}
      </div>

      {topics.length === 0 ? (
        <div className="px-5 py-8 sm:px-6">
          <p className="text-sm font-medium">Aún no hay resultados por tema</p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
            Cuando completes cuestionarios, podrás identificar tus fortalezas
            y los temas que necesitas practicar.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {topics.map((topic) => {
            const accuracy = getAccuracy(topic);

            return (
              <li
                key={`${topic.document_id}:${topic.topic}`}
                className="px-5 py-4 sm:px-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-sm font-semibold leading-6">
                      {topic.topic}
                    </h4>
                    <p className="mt-0.5 break-words text-xs leading-5 text-muted">
                      {topic.filename}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
                      {statusLabels[topic.status]}
                    </span>
                    <span className="min-w-12 text-right text-sm font-semibold tabular-nums">
                      {accuracy === null
                        ? "—"
                        : `${percentFormatter.format(accuracy)} %`}
                    </span>
                  </div>
                </div>

                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-soft"
                  role="progressbar"
                  aria-label={`Precisión en ${topic.topic}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={accuracy ?? undefined}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${accuracy ?? 0}%`,
                      background: "var(--chart-primary)",
                    }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-muted">
                  <span>{topic.questions_evaluated} preguntas evaluadas</span>
                  <span>{topic.correct_questions} correctas</span>
                  <span>{topic.incorrect_questions} incorrectas</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
