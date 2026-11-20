
"use client";

import type { TopicProgress } from "@/types/topic-progress";
import Link from "next/link";
import { DashboardReveal } from "./dashboard-reveal";

const statusLabels: Record<TopicProgress["status"], string> = {
  insufficient_data: "Más práctica necesaria",
  reinforce: "Necesita refuerzo",
  review: "Conviene repasar",
  strong: "Buen dominio",
};

const percentFormatter = new Intl.NumberFormat("es-CR", {
  maximumFractionDigits: 2,
});

type DocumentTopicGroup = {
  document_id: string;
  filename: string;
  topics: TopicProgress[];
  questions_evaluated: number;
  correct_questions: number;
  incorrect_questions: number;
};

type TopicFeedback = {
  label: string;
  description: string;
  status: TopicProgress["status"];
  priority: number;
};

function getAccuracy(
  correct: number,
  total: number,
): number | null {
  if (total <= 0) return null;

  return Math.min(
    100,
    Math.max(0, (correct / total) * 100),
  );
}

function formatAccuracy(accuracy: number | null): string {
  return accuracy === null
    ? "—"
    : `${percentFormatter.format(accuracy)} %`;
}

function getTopicFeedback(
  topic: TopicProgress,
): TopicFeedback {
  const total = topic.questions_evaluated;
  const correct = topic.correct_questions;
  const incorrect = topic.incorrect_questions;

  // Pocas respuestas: evitar porcentajes que aparenten dominio.
  if (total < 3) {
    if (incorrect === 0) {
      return {
        label: "Buen comienzo",
        description:
          "Las respuestas registradas fueron correctas. " +
          "Hace falta practicar más para evaluar tu dominio.",
        status: "insufficient_data",
        priority: 5,
      };
    }

    if (total === 2 && incorrect === 2) {
      return {
        label: "Refuerzo recomendado",
        description:
          "Las dos respuestas fueron incorrectas. " +
          "Conviene practicar este tema primero.",
        status: "reinforce",
        priority: 1,
      };
    }

    if (total === 1) {
      return {
        label: "Conviene repasar",
        description:
          "La respuesta fue incorrecta. Repasa este concepto " +
          "y resuelve más ejercicios para comprobar tu progreso.",
        status: "review",
        priority: 2,
      };
    }

    if (total === 2 && correct === 1) {
      return {
        label: "Seguir practicando",
        description:
          "Tuviste un acierto y un error. " +
          "Necesitas más ejercicios para evaluar este tema.",
        status: "review",
        priority: 3,
      };
    }

    return {
      label: "Más práctica necesaria",
      description:
        "Todavía no hay suficientes respuestas para evaluar el tema.",
      status: "insufficient_data",
      priority: 4,
    };
  }

  // Tres o más preguntas: utilizar la evaluación del backend.
  const descriptions: Record<TopicProgress["status"], string> = {
    insufficient_data:
      "Continúa practicando para obtener una evaluación más completa.",
    reinforce:
      "Se registraron varios errores. Conviene reforzar este tema.",
    review:
      "Hay conceptos que puedes mejorar con un repaso.",
    strong:
      "Buen resultado en las preguntas evaluadas. " +
      "Continúa practicando para mantenerlo.",
  };

  const priorities: Record<TopicProgress["status"], number> = {
    reinforce: 0,
    review: 3,
    insufficient_data: 4,
    strong: 5,
  };

  return {
    label: statusLabels[topic.status],
    description: descriptions[topic.status],
    status: topic.status,
    priority: priorities[topic.status],
  };
}

function groupTopicsByDocument(
  topics: TopicProgress[],
): DocumentTopicGroup[] {
  const documents = new Map<string, DocumentTopicGroup>();

  for (const topic of topics) {
    let document = documents.get(topic.document_id);

    if (!document) {
      document = {
        document_id: topic.document_id,
        filename: topic.filename,
        topics: [],
        questions_evaluated: 0,
        correct_questions: 0,
        incorrect_questions: 0,
      };

      documents.set(topic.document_id, document);
    }

    document.topics.push(topic);
    document.questions_evaluated += topic.questions_evaluated;
    document.correct_questions += topic.correct_questions;
    document.incorrect_questions += topic.incorrect_questions;
  }

  return Array.from(documents.values());
}

function getSuggestedTopics(
  topics: TopicProgress[],
): TopicProgress[] {
  return topics
    .filter((topic) => {
      const feedback = getTopicFeedback(topic);

      return (
        topic.incorrect_questions > 0 &&
        feedback.status !== "strong"
      );
    })
    .sort((a, b) => {
      const priorityDifference =
        getTopicFeedback(a).priority -
        getTopicFeedback(b).priority;

      return priorityDifference !== 0
        ? priorityDifference
        : b.incorrect_questions - a.incorrect_questions;
    })
    .slice(0, 2);
}

export function TopicProgressSection({
  topics,
}: {
  topics: TopicProgress[] | null;
}) {
  const documents = topics
    ? groupTopicsByDocument(topics)
    : [];

  return (
    <DashboardReveal className="mt-5" containerEntrance>
      <section
        data-reveal="container"
        className="workspace-panel overflow-hidden"
        aria-labelledby="topic-progress-title"
      >
        <div className="workspace-panel-heading border-b border-border">
          <div className="min-w-0">
            <h3
              id="topic-progress-title"
              className="workspace-panel-title"
            >
              Rendimiento por tema
            </h3>

            <p className="mt-1 text-xs leading-5 text-muted">
              Identifica qué has aprendido y qué conviene practicar.
            </p>
          </div>

          {documents.length > 0 && (
            <span className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-medium tabular-nums text-muted">
              {documents.length}{" "}
              {documents.length === 1
                ? "documento evaluado"
                : "documentos evaluados"}
            </span>
          )}
        </div>

        {topics === null ? (
          <div
            role="status"
            className="px-5 py-8 text-sm text-muted sm:px-6"
          >
            No se pudo cargar el rendimiento por tema.
            Recarga la página para intentarlo de nuevo.
          </div>
        ) : documents.length === 0 ? (
          <div className="px-5 py-8 sm:px-6">
            <p className="text-sm font-medium">
              Aún no hay resultados por tema
            </p>

            <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
              Cuando completes cuestionarios, podrás identificar
              tus fortalezas y los temas que necesitas practicar.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((document) => {
              const documentAccuracy = getAccuracy(
                document.correct_questions,
                document.questions_evaluated,
              );

              const topicCount = document.topics.length;
              const suggestedTopics = getSuggestedTopics(
                document.topics,
              );

              return (
                <li key={document.document_id}>
                  <details className="group">
                    <summary
                      className="
                        flex cursor-pointer list-none
                        items-center justify-between
                        gap-4 px-5 py-4
                        transition-colors
                        hover:bg-surface-soft/40
                        group-open:bg-surface-soft/30
                        focus-visible:outline-2
                        focus-visible:outline-offset-[-2px]
                        focus-visible:outline-accent-foreground
                        sm:px-6
                        [&::-webkit-details-marker]:hidden
                      "
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="break-words text-sm font-semibold leading-6">
                          {document.filename}
                        </h4>

                        <p className="mt-1 text-xs leading-5 text-muted">
                          {document.questions_evaluated}{" "}
                          {document.questions_evaluated === 1
                            ? "pregunta evaluada"
                            : "preguntas evaluadas"}
                          {" · "}
                          {topicCount}{" "}
                          {topicCount === 1
                            ? "tema"
                            : "temas"}
                        </p>

                        <p className="mt-1 text-xs leading-5 tabular-nums text-muted">
                          {document.correct_questions}{" "}
                          {document.correct_questions === 1
                            ? "correcta"
                            : "correctas"}
                          {" · "}
                          {document.incorrect_questions}{" "}
                          {document.incorrect_questions === 1
                            ? "incorrecta"
                            : "incorrectas"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatAccuracy(documentAccuracy)}
                        </span>

                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="
                            size-4 text-muted
                            transition-transform duration-200
                            group-open:rotate-180
                            motion-reduce:transition-none
                          "
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </summary>

                    <div className="border-t-2 border-border bg-surface-soft/20 px-4 py-4 sm:px-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
                        <div>
                          <h5 className="text-xs font-semibold">
                            Desglose por tema
                          </h5>

                          <p className="mt-1 text-xs text-muted">
                            {topicCount}{" "}
                            {topicCount === 1
                              ? "tema evaluado"
                              : "temas evaluados"}
                          </p>
                        </div>

                        <Link
                          href={`/dashboard/documents/${encodeURIComponent(
                            document.document_id,
                          )}`}
                          className="text-xs font-medium text-muted underline-offset-4 hover:text-accent-foreground hover:underline"
                        >
                          Ver documento
                        </Link>
                      </div>

                      {suggestedTopics.length > 0 && (
                        <div className="mb-4 rounded-xl border border-border bg-surface-soft/40 px-4 py-3">
                          <p className="text-xs font-semibold">
                            Sugerencia de estudio
                          </p>

                          <p className="mt-1 text-xs leading-5 text-muted">
                            Según tus respuestas, conviene practicar
                            primero:{" "}
                            <span className="font-medium text-foreground">
                              {suggestedTopics
                                .map((topic) => topic.topic)
                                .join(" y ")}
                            </span>
                            .
                          </p>
                        </div>
                      )}

                      <ul className="space-y-2.5">
                        {document.topics.map((topic) => {
                          const feedback = getTopicFeedback(topic);

                          const showPercentage =
                            topic.questions_evaluated >= 3;

                          const accuracy = getAccuracy(
                            topic.correct_questions,
                            topic.questions_evaluated,
                          );

                          return (
                            <li
                              key={`${topic.document_id}:${topic.topic}`}
                              className="rounded-xl border border-border bg-surface-soft/50 px-4 py-3.5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
                                <div className="min-w-0 flex-1">
                                  <h6 className="break-words text-sm font-semibold leading-6">
                                    {topic.topic}
                                  </h6>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                  <span
                                    data-status={feedback.status}
                                    className="topic-status rounded-full border px-2.5 py-1 text-xs font-medium"
                                  >
                                    {feedback.label}
                                  </span>

                                  {showPercentage && (
                                    <span className="min-w-12 text-right text-sm font-semibold tabular-nums">
                                      {formatAccuracy(accuracy)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="mt-2 text-xs leading-5 tabular-nums text-muted">
                                {topic.questions_evaluated}{" "}
                                {topic.questions_evaluated === 1
                                  ? "pregunta evaluada"
                                  : "preguntas evaluadas"}
                                {" · "}
                                {topic.correct_questions}{" "}
                                {topic.correct_questions === 1
                                  ? "correcta"
                                  : "correctas"}
                                {" · "}
                                {topic.incorrect_questions}{" "}
                                {topic.incorrect_questions === 1
                                  ? "incorrecta"
                                  : "incorrectas"}
                              </p>

                              {showPercentage && (
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
                              )}

                              <p className="mt-2 text-xs leading-5 text-muted">
                                {feedback.description}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </DashboardReveal>
  );
}
