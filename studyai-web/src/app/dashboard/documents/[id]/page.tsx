"use client";

import { DashboardBackLink } from "@/components/dashboard/dashboard-navigation";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, startTransition, useEffect, useLayoutEffect, useState, type FormEvent, type ReactNode } from "react";
import type { StudyDocument } from "@/types/documents";
import { DocumentDetailSkeleton } from "@/components/dashboard/documents-skeleton";
import { redirectExpiredSession } from "@/lib/session-client";

const CHUNK_LIMIT = 8;

const GENERATION_MESSAGES = [
  "Generando preguntas a partir de tu documento...",
  "La IA continúa trabajando con el contenido del PDF...",
  "Preparando un cuestionario para que puedas estudiar...",
  "Seguimos procesando tu solicitud...",
] as const;

type DocumentChunk = {
  id: string;
  page_number: number | null;
  chunk_index: number;
  text: string;
};

type DocumentDetailResponse = {
  document: StudyDocument;
  chunks: DocumentChunk[];
  chunk_count: number;
  limit: number;
  offset: number;
};

type RequestState = {
  key: string;
  data: DocumentDetailResponse | null;
  error: string;
};

type QuizDifficulty = "facil" | "intermedia" | "dificil";

type GeneratedQuiz = {
  id: string | null;
  title: string;
};

type SavedQuiz = {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  question_count: number;
};

type SavedQuizzesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; quizzes: SavedQuiz[] };

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(date);
}

function extractQuizId(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const data = value as Record<string, unknown>;

  if (typeof data.id === "string") return data.id;
  if (typeof data.quiz_id === "string") return data.quiz_id;

  if (typeof data.quiz === "object" && data.quiz !== null && "id" in data.quiz && typeof data.quiz.id === "string") {
    return data.quiz.id;
  }

  return null;
}

function isSavedQuiz(value: unknown): value is SavedQuiz {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const quiz = value as Record<string, unknown>;

  return (
    typeof quiz.id === "string" &&
    typeof quiz.document_id === "string" &&
    typeof quiz.title === "string" &&
    typeof quiz.created_at === "string" &&
    typeof quiz.question_count === "number"
  );
}

function DocumentDetailLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <DashboardBackLink href="/dashboard/documents">Volver a mis documentos</DashboardBackLink>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function SavedQuizzesSkeleton() {
  return (
    <div role="status" aria-label="Cargando cuestionarios guardados" className="grid animate-pulse gap-4 md:grid-cols-2 motion-reduce:animate-none">
      {["quiz-a", "quiz-b"].map((item) => (
        <div key={item} className="rounded-2xl border border-input-border bg-surface p-5">
          <div className="h-3 w-24 rounded-full bg-surface-soft" />
          <div className="mt-5 h-5 w-4/5 rounded-lg bg-surface-soft" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-surface-soft" />
          <div className="mt-6 h-11 w-36 rounded-xl bg-surface-soft" />
        </div>
      ))}
    </div>
  );
}

function SavedQuizzes({ documentId, refreshKey }: { documentId: string; refreshKey: number }) {
  const [state, setState] = useState<SavedQuizzesState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuizzes() {
      try {
        const response = await fetch("/api/quizzes", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            if (!controller.signal.aborted) await redirectExpiredSession();
            return;
          }

          throw new Error("No se pudieron consultar los cuestionarios.");
        }

        const payload: unknown = await response.json();

        if (typeof payload !== "object" || payload === null || !("quizzes" in payload) || !Array.isArray(payload.quizzes)) {
          throw new Error("El servidor devolvió un listado inesperado.");
        }

        if (!payload.quizzes.every(isSavedQuiz)) {
          throw new Error("Los datos de los cuestionarios no son válidos.");
        }

        const quizzes = payload.quizzes
          .filter((quiz) => quiz.document_id === documentId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));

        if (controller.signal.aborted) return;

        startTransition(() => {
          setState({ status: "ready", quizzes });
        });
      } catch (caught) {
        if (controller.signal.aborted) return;

        startTransition(() => {
          setState({
            status: "error",
            message: caught instanceof Error ? caught.message : "No se pudieron cargar los cuestionarios.",
          });
        });
      }
    }

    void loadQuizzes();

    return () => {
      controller.abort();
    };
  }, [documentId, refreshKey, retryKey]);

  return (
    <section id="document-quizzes" aria-labelledby="saved-quizzes-title" className="scroll-mt-28 space-y-5">
      <div>
        <p className="text-sm font-medium text-primary">Biblioteca de evaluaciones</p>

        <h2 id="saved-quizzes-title" className="mt-2 font-display text-lg font-semibold tracking-tight">
          Mis cuestionarios
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Cuestionarios guardados a partir de este PDF. Puedes utilizarlos en Práctica o Examen sin consumir Gemini nuevamente.
        </p>
      </div>

      {state.status === "loading" ? (
        <SavedQuizzesSkeleton />
      ) : state.status === "error" ? (
        <div className="workspace-panel p-6">
          <p role="alert" className="text-sm text-muted">{state.message}</p>

          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setRetryKey((value) => value + 1);
            }}
            className="workspace-action mt-4"
          >
            Reintentar
          </button>
        </div>
      ) : state.quizzes.length === 0 ? (
        <div className="workspace-panel px-6 py-8">
          <p className="font-medium">Aún no hay cuestionarios para este documento.</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Puedes crear el primero con el formulario de generación que aparece a continuación.
          </p>
        </div>
      ) : (
        <DashboardReveal className="grid gap-4 md:grid-cols-2">
          {state.quizzes.map((quiz) => (
            <article
              key={quiz.id}
              className="workspace-panel group flex flex-col justify-between gap-6 p-5 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 motion-reduce:transition-none sm:p-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
                    {quiz.question_count} {quiz.question_count === 1 ? "pregunta" : "preguntas"}
                  </span>
                  <span className="text-xs text-muted">{formatDate(quiz.created_at)}</span>
                </div>

                <h3 className="mt-5 break-words font-display text-lg font-semibold leading-7">
                  {quiz.title}
                </h3>
              </div>

              <Link href={`/dashboard/quizzes/${encodeURIComponent(quiz.id)}`} className="workspace-action workspace-action-primary w-fit">
                Abrir cuestionario
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </DashboardReveal>
      )}
    </section>
  );
}

function QuizGenerator({ documentId, filename, onGenerated }: {
  documentId: string;
  filename: string;
  onGenerated: () => void;
}) {
  const defaultTitle = `Cuestionario: ${filename.replace(/\.pdf$/i, "")}`;

  const [title, setTitle] = useState(defaultTitle);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("intermedia");
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessageIndex, setGenerationMessageIndex] = useState(0);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [generationError, setGenerationError] = useState("");

  useEffect(() => {
    if (!isGenerating) return;

    const intervalId = window.setInterval(() => {
      setGenerationMessageIndex((index) => (index + 1) % GENERATION_MESSAGES.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [isGenerating]);

  async function handleGenerateQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isGenerating || generatedQuiz) return;

    setGenerationError("");

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setGenerationError("Escribe un título para el cuestionario.");
      return;
    }

    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 20) {
      setGenerationError("Selecciona una cantidad entre 1 y 20 preguntas.");
      return;
    }

    setGenerationMessageIndex(0);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          document_id: documentId,
          title: normalizedTitle,
          question_count: questionCount,
          difficulty,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          await redirectExpiredSession();
          return;
        }

        if (response.status === 403 || response.status === 404) {
          throw new Error("No tienes acceso al documento o ya no existe.");
        }

        if (response.status === 422) {
          throw new Error("Los parámetros del cuestionario no son válidos.");
        }

        if (response.status === 429) {
          throw new Error("Se alcanzó un límite de solicitudes. Intenta más tarde.");
        }

        throw new Error("No se pudo generar el cuestionario. Inténtalo nuevamente.");
      }

      const result: unknown = await response.json();

      setGeneratedQuiz({
        id: extractQuizId(result),
        title: normalizedTitle,
      });

      onGenerated();
    } catch (caught) {
      setGenerationError(caught instanceof Error ? caught.message : "Ocurrió un error al generar el cuestionario.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section aria-labelledby="quiz-generator-title" className="workspace-panel overflow-hidden">
      <div className="border-b border-border/60 px-5 py-5 sm:px-7">
        <p className="text-xs font-medium text-accent-foreground">
          Estudio con inteligencia artificial
        </p>

        <h2 id="quiz-generator-title" className="mt-2 text-xl font-semibold tracking-tight">
          Generar cuestionario
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Genera preguntas a partir de este documento. Después podrás utilizar el cuestionario en Práctica o Examen.
        </p>
      </div>

      <div className="min-w-0 p-5 sm:p-7">
        {generatedQuiz ? (
          <div role="status" className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </span>

              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold">Cuestionario generado</h3>
                <p className="mt-2 break-words text-sm text-muted">{generatedQuiz.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Tu cuestionario se guardó correctamente. Puedes abrirlo y elegir Práctica o Examen.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {generatedQuiz.id ? (
                <Link href={`/dashboard/quizzes/${encodeURIComponent(generatedQuiz.id)}`} className="workspace-action workspace-action-primary">
                  Abrir cuestionario
                  <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <a
                  href="#document-quizzes"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Ver mis cuestionarios
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setGeneratedQuiz(null);
                  setGenerationError("");
                }}
                className="workspace-action"
              >
                Crear otro cuestionario
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGenerateQuiz} aria-label="Configuración del cuestionario" className="space-y-6">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="quiz-title" className="block text-sm font-semibold">
                  Título del cuestionario
                </label>

                <span className="text-xs tabular-nums text-muted" aria-hidden="true">
                  {title.length}/120
                </span>
              </div>

              <input
                id="quiz-title"
                name="title"
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setGenerationError("");
                }}
                disabled={isGenerating}
                placeholder="Ejemplo: Evaluación de tecnología"
                aria-describedby="quiz-title-hint"
                className="workspace-field quiz-config-input mt-2"
              />

              <p id="quiz-title-hint" className="mt-2 text-sm text-muted">
                Así aparecerá en tus cuestionarios.
              </p>
            </div>

            <div className="grid items-start gap-6 sm:grid-cols-2">
              <fieldset disabled={isGenerating} className="min-w-0" aria-describedby="quiz-difficulty-hint">
                <legend className="text-sm font-medium">Dificultad</legend>

                <div className="quiz-difficulty-segments mt-2">
                  {([
                    { value: "facil", label: "Fácil", icon: "levelEasy" },
                    { value: "intermedia", label: "Intermedia", icon: "levelMedium" },
                    { value: "dificil", label: "Difícil", icon: "levelHard" },
                  ] as const).map((option) => (
                    <label key={option.value} className="quiz-difficulty-segment">
                      <input
                        type="radio"
                        name="difficulty"
                        value={option.value}
                        checked={difficulty === option.value}
                        onChange={() => setDifficulty(option.value)}
                        className="sr-only"
                      />

                      <DashboardIcon name={option.icon} className="quiz-difficulty-icon size-4 shrink-0" />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                <p id="quiz-difficulty-hint" className="mt-2 text-sm leading-5 text-muted">
                  {difficulty === "facil"
                    ? "Repasa los conceptos esenciales."
                    : difficulty === "intermedia"
                      ? "Relaciona y aplica lo aprendido."
                      : "Profundiza con preguntas más exigentes."}
                </p>
              </fieldset>

              <div className="min-w-0">
                <label htmlFor="quiz-question-count" className="block text-sm font-semibold">
                  Cantidad de preguntas
                </label>

                <div className="quiz-question-stepper mt-2">
                  <button
                    type="button"
                    aria-label="Reducir cantidad de preguntas"
                    disabled={isGenerating || questionCount <= 1}
                    onClick={() => setQuestionCount((count) => Math.max(1, count - 1))}
                  >
                    <span aria-hidden="true">−</span>
                  </button>

                  <input
                    id="quiz-question-count"
                    name="question_count"
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    required
                    value={questionCount}
                    disabled={isGenerating}
                    onChange={(event) => setQuestionCount(Number(event.target.value))}
                    aria-describedby="quiz-question-hint"
                    className="quiz-question-input"
                  />

                  <button
                    type="button"
                    aria-label="Aumentar cantidad de preguntas"
                    disabled={isGenerating || questionCount >= 20}
                    onClick={() => setQuestionCount((count) => Math.min(20, count + 1))}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>

                <p id="quiz-question-hint" className="mt-2 text-sm text-muted">
                  Entre 1 y 20 preguntas.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-sm text-xs leading-5 text-muted">
                Preguntas basadas en tu documento.
                <br />
                La generación con IA puede consumir tu cuota disponible.
              </p>

              <button
                type="submit"
                disabled={isGenerating}
                aria-busy={isGenerating}
                className="workspace-action workspace-action-primary min-h-12 shrink-0"
              >
                {isGenerating ? (
                  <>
                    <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                    Generando...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
                      <path d="M19 17v4M17 19h4" />
                    </svg>
                    Generar cuestionario
                  </>
                )}
              </button>
            </div>

            {isGenerating && (
              <div role="status" aria-live="polite" aria-atomic="true" className="flex items-start gap-3 rounded-2xl border border-border bg-surface-soft p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                  <DashboardIcon name="spark" className="size-5 animate-pulse motion-reduce:animate-none" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">StudyAI está generando tu cuestionario</p>
                  <p key={generationMessageIndex} className="mt-1 animate-pulse text-sm leading-6 text-muted motion-reduce:animate-none">
                    {GENERATION_MESSAGES[generationMessageIndex]}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Mantén la página abierta. Estos mensajes son informativos, no porcentajes ni etapas reales.
                  </p>
                </div>

                <span className="mt-1 size-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary motion-reduce:animate-none" aria-hidden="true" />
              </div>
            )}

            {generationError && (
              <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-500">
                {generationError}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

function DocumentQuizzes({ documentId, filename }: { documentId: string; filename: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <SavedQuizzes documentId={documentId} refreshKey={refreshKey} />
      <QuizGenerator documentId={documentId} filename={filename} onGenerated={() => setRefreshKey((value) => value + 1)} />
    </div>
  );
}

function DocumentDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [requestState, setRequestState] = useState<RequestState | null>(null);

  const requestKey = `${id}:${offset}:${reloadKey}`;

  useLayoutEffect(() => {
    return () => {
      setRequestState(null);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDocument() {
      try {
        const query = new URLSearchParams({
          limit: String(CHUNK_LIMIT),
          offset: String(offset),
        });

        const response = await fetch(`/api/documents/${encodeURIComponent(id)}?${query}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401) {
            if (!controller.signal.aborted) await redirectExpiredSession();
            return;
          }

          if (response.status === 404) {
            throw new Error("El documento no existe o no tienes acceso a él.");
          }

          throw new Error("No se pudo consultar el documento.");
        }

        const data: DocumentDetailResponse = await response.json();

        if (!data.document || !Array.isArray(data.chunks) || typeof data.chunk_count !== "number") {
          throw new Error("El servidor devolvió una respuesta inesperada.");
        }

        const revealDocument = () => {
          if (controller.signal.aborted) return;

          startTransition(() => {
            setRequestState({ key: requestKey, data, error: "" });
          });
        };

        revealDocument();
      } catch (caught) {
        if (controller.signal.aborted) return;

        startTransition(() => {
          setRequestState({
            key: requestKey,
            data: null,
            error: caught instanceof Error ? caught.message : "No se pudo cargar el documento.",
          });
        });
      }
    }

    void loadDocument();

    return () => {
      controller.abort();
    };
  }, [id, offset, reloadKey, requestKey]);

  const isLoading = requestState?.key !== requestKey;
  const data = !isLoading ? requestState?.data : null;
  const error = !isLoading ? requestState?.error : "";
  const document = data?.document;
  const chunks = data?.chunks ?? [];
  const totalChunks = data?.chunk_count ?? 0;

  const currentPage = Math.floor(offset / CHUNK_LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(totalChunks / CHUNK_LIMIT));

  return (
    <DocumentDetailLayout>
      <>
        {isLoading ? (
          <DocumentDetailSkeleton />
        ) : error ? (
          <section className="workspace-panel p-6 sm:p-8">
            <h1 className="font-display text-xl font-semibold">No se pudo cargar el documento</h1>
            <p role="alert" className="mt-3 text-sm text-muted">{error}</p>

            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="workspace-action workspace-action-primary mt-6"
            >
              Reintentar
            </button>
          </section>
        ) : document ? (
          <DashboardReveal className="space-y-8">
            <header>
              <p className="text-sm font-medium text-primary">Documento de estudio</p>

              <h1 className="mt-2 break-words font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                {document.filename}
              </h1>

              <p className="mt-3 text-sm text-muted">Subido el {formatDate(document.created_at)}</p>
            </header>

            <section aria-label="Información del documento" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                { label: "Tamaño", value: formatFileSize(document.size_bytes) },
                { label: "Páginas con texto", value: String(document.pages_with_text) },
                { label: "Caracteres extraídos", value: document.text_length.toLocaleString("es-CR") },
                { label: "Fragmentos", value: String(totalChunks) },
              ].map((stat) => (
                <div key={stat.label} className="workspace-panel !rounded-2xl px-4 py-3.5">
                  <p className="text-sm text-muted">{stat.label}</p>
                  <p className="mt-2 text-xl font-semibold tabular-nums">{stat.value}</p>
                </div>
              ))}
            </section>

            <DocumentQuizzes key={document.id} documentId={document.id} filename={document.filename} />

            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">Contenido extraído</h2>
                  <p className="mt-2 text-sm text-muted">
                    Fragmentos de texto almacenados y procesados por StudyAI.
                  </p>
                </div>

                <span className="text-sm text-muted">
                  Página {currentPage} de {totalPages}
                </span>
              </div>

              {chunks.length === 0 ? (
                <div className="workspace-panel p-8 text-center text-sm text-muted">
                  No hay fragmentos de texto disponibles.
                </div>
              ) : (
                <div className="space-y-4">
                  {chunks.map((chunk) => (
                    <article key={chunk.id} className="workspace-panel p-5 sm:p-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                          Fragmento {chunk.chunk_index}
                        </span>

                        {chunk.page_number !== null && (
                          <span className="text-xs text-muted">Página {chunk.page_number}</span>
                        )}
                      </div>

                      <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                        {chunk.text}
                      </p>
                    </article>
                  ))}
                </div>
              )}

              {totalChunks > CHUNK_LIMIT && (
                <nav aria-label="Paginación de fragmentos" className="mt-6 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() => setOffset((value) => Math.max(0, value - CHUNK_LIMIT))}
                    className="workspace-action"
                  >
                    Anterior
                  </button>

                  <span className="text-sm text-muted">{currentPage} / {totalPages}</span>

                  <button
                    type="button"
                    disabled={offset + CHUNK_LIMIT >= totalChunks}
                    onClick={() => setOffset((value) => value + CHUNK_LIMIT)}
                    className="workspace-action"
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </section>
          </DashboardReveal>
        ) : null}
      </>
    </DocumentDetailLayout>
  );
}

export default function DocumentDetailPage() {
  return (
    <Suspense
      fallback={
        <DocumentDetailLayout>
          <DocumentDetailSkeleton />
        </DocumentDetailLayout>
      }
    >
      <DocumentDetailContent />
    </Suspense>
  );
}