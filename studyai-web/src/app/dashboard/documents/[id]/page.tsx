"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Suspense,
  ViewTransition,
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type { StudyDocument } from "@/types/documents";
import { DocumentDetailSkeleton } from "@/components/dashboard/documents-skeleton";
import { redirectExpiredSession } from "@/lib/session-client";

const CHUNK_LIMIT = 8;
const INITIAL_SKELETON_MS = 450;

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
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
  }).format(date);
}

function extractQuizId(value: unknown): string | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  const data = value as Record<string, unknown>;

  if (typeof data.id === "string") {
    return data.id;
  }

  if (typeof data.quiz_id === "string") {
    return data.quiz_id;
  }

  if (
    typeof data.quiz === "object" &&
    data.quiz !== null &&
    "id" in data.quiz &&
    typeof data.quiz.id === "string"
  ) {
    return data.quiz.id;
  }

  return null;
}

function isSavedQuiz(value: unknown): value is SavedQuiz {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const quiz = value as Record<string, unknown>;

  return (
    typeof quiz.id === "string" &&
    typeof quiz.document_id === "string" &&
    typeof quiz.title === "string" &&
    typeof quiz.created_at === "string" &&
    typeof quiz.question_count === "number"
  );
}

function DocumentDetailLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
      >
        <span aria-hidden="true">←</span>
        Volver a mis documentos
      </Link>

      <div className="mt-8">{children}</div>
    </main>
  );
}

/**
 * Skeleton exclusivo del listado de cuestionarios.
 * No sustituye el skeleton del documento.
 */
function SavedQuizzesSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando cuestionarios guardados"
      className="grid animate-pulse gap-4 md:grid-cols-2 motion-reduce:animate-none"
    >
      {["quiz-a", "quiz-b"].map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-input-border bg-surface p-5"
        >
          <div className="h-3 w-24 rounded-full bg-surface-soft" />
          <div className="mt-5 h-5 w-4/5 rounded-lg bg-surface-soft" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-surface-soft" />

          <div className="mt-6 h-11 w-36 rounded-xl bg-surface-soft" />
        </div>
      ))}
    </div>
  );
}

/**
 * Obtiene los cuestionarios existentes en PostgreSQL
 * mediante GET /api/quizzes y filtra por documento.
 */
function SavedQuizzes({
  documentId,
  refreshKey,
}: {
  documentId: string;
  refreshKey: number;
}) {
  const [state, setState] = useState<SavedQuizzesState>({
    status: "loading",
  });

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

          throw new Error(
            "No se pudieron consultar los cuestionarios.",
          );
        }

        const payload: unknown = await response.json();

        if (
          typeof payload !== "object" ||
          payload === null ||
          !("quizzes" in payload) ||
          !Array.isArray(payload.quizzes)
        ) {
          throw new Error(
            "El servidor devolvió un listado inesperado.",
          );
        }

        if (!payload.quizzes.every(isSavedQuiz)) {
          throw new Error(
            "Los datos de los cuestionarios no son válidos.",
          );
        }

        const quizzes = payload.quizzes
          .filter((quiz) => quiz.document_id === documentId)
          .sort((a, b) =>
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
              caught instanceof Error
                ? caught.message
                : "No se pudieron cargar los cuestionarios.",
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
    <section
      id="document-quizzes"
      aria-labelledby="saved-quizzes-title"
      className="scroll-mt-28 space-y-5"
    >
      <div>
        <p className="text-sm font-medium text-primary">
          Biblioteca de evaluaciones
        </p>

        <h2
          id="saved-quizzes-title"
          className="mt-2 font-display text-2xl font-semibold tracking-tight"
        >
          Mis cuestionarios
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Evaluaciones que ya has generado a partir de este PDF.
          Puedes resolverlas nuevamente sin consumir Gemini.
        </p>
      </div>

      {state.status === "loading" ? (
        <SavedQuizzesSkeleton />
      ) : state.status === "error" ? (
        <div className="rounded-2xl border border-input-border bg-surface p-6">
          <p role="alert" className="text-sm text-muted">
            {state.message}
          </p>

          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setRetryKey((value) => value + 1);
            }}
            className="mt-4 min-h-11 cursor-pointer rounded-xl border border-input-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-soft"
          >
            Reintentar
          </button>
        </div>
      ) : state.quizzes.length === 0 ? (
        <div className="rounded-2xl border border-input-border bg-surface px-6 py-8">
          <p className="font-medium">
            Aún no hay cuestionarios para este documento.
          </p>

          <p className="mt-2 text-sm leading-6 text-muted">
            Puedes crear el primero con el formulario de generación
            que aparece a continuación.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {state.quizzes.map((quiz) => (
            <article
              key={quiz.id}
              className="group flex flex-col justify-between gap-6 rounded-2xl border border-input-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transition-none sm:p-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
                    {quiz.question_count}{" "}
                    {quiz.question_count === 1
                      ? "pregunta"
                      : "preguntas"}
                  </span>

                  <span className="text-xs text-muted">
                    {formatDate(quiz.created_at)}
                  </span>
                </div>

                <h3 className="mt-5 break-words font-display text-lg font-semibold leading-7">
                  {quiz.title}
                </h3>
              </div>

              <Link
                href={`/dashboard/quizzes/${encodeURIComponent(quiz.id)}`}
                className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none"
              >
                Resolver cuestionario
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Genera un cuestionario nuevo y avisa al listado
 * para que consulte nuevamente los registros.
 */
function QuizGenerator({
  documentId,
  filename,
  onGenerated,
}: {
  documentId: string;
  filename: string;
  onGenerated: () => void;
}) {
  const defaultTitle = `Cuestionario: ${filename.replace(/\.pdf$/i, "")}`;

  const [title, setTitle] = useState(defaultTitle);

  const [difficulty, setDifficulty] =
    useState<QuizDifficulty>("intermedia");

  const [questionCount, setQuestionCount] = useState(5);

  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedQuiz, setGeneratedQuiz] =
    useState<GeneratedQuiz | null>(null);

  const [generationError, setGenerationError] = useState("");

  async function handleGenerateQuiz(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isGenerating || generatedQuiz) return;

    setGenerationError("");

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setGenerationError(
        "Escribe un título para el cuestionario.",
      );
      return;
    }

    if (
      !Number.isInteger(questionCount) ||
      questionCount < 1 ||
      questionCount > 20
    ) {
      setGenerationError(
        "Selecciona una cantidad entre 1 y 20 preguntas.",
      );
      return;
    }

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

        if (
          response.status === 403 ||
          response.status === 404
        ) {
          throw new Error(
            "No tienes acceso al documento o ya no existe.",
          );
        }

        if (response.status === 422) {
          throw new Error(
            "Los parámetros del cuestionario no son válidos.",
          );
        }

        if (response.status === 429) {
          throw new Error(
            "Se alcanzó un límite de solicitudes. Intenta más tarde.",
          );
        }

        throw new Error(
          "No se pudo generar el cuestionario. Inténtalo nuevamente.",
        );
      }

      const result: unknown = await response.json();

      setGeneratedQuiz({
        id: extractQuizId(result),
        title: normalizedTitle,
      });

      onGenerated();
    } catch (caught) {
      setGenerationError(
        caught instanceof Error
          ? caught.message
          : "Ocurrió un error al generar el cuestionario.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section
      aria-labelledby="quiz-generator-title"
      className="overflow-hidden rounded-2xl border border-primary/20 bg-surface"
    >
      <div className="border-b border-input-border bg-accent-soft px-5 py-6 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-foreground">
          Estudio con inteligencia artificial
        </p>

        <h2
          id="quiz-generator-title"
          className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Generar cuestionario
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Crea una evaluación a partir del contenido de este
          documento. Elige la dificultad y la cantidad de preguntas.
        </p>
      </div>

      <div className="p-5 sm:p-7">
        {generatedQuiz ? (
          <div role="status" className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </span>

              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold">
                  Cuestionario generado
                </h3>

                <p className="mt-2 break-words text-sm text-muted">
                  {generatedQuiz.title}
                </p>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Tu evaluación se ha creado correctamente
                  y está disponible para resolverla.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {generatedQuiz.id ? (
                <Link
                  href={`/dashboard/quizzes/${encodeURIComponent(generatedQuiz.id)}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] motion-reduce:transition-none"
                >
                  Resolver ahora
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
                className="min-h-11 cursor-pointer rounded-xl border border-input-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-soft"
              >
                Crear otro cuestionario
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleGenerateQuiz}
            aria-label="Configuración del cuestionario"
            className="space-y-6"
          >
            <div>
              <label
                htmlFor="quiz-title"
                className="block text-sm font-medium"
              >
                Título del cuestionario
              </label>

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
                className="mt-2 min-h-12 w-full rounded-xl border border-input-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-focus disabled:opacity-60"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="quiz-difficulty"
                  className="block text-sm font-medium"
                >
                  Dificultad
                </label>

                <select
                  id="quiz-difficulty"
                  name="difficulty"
                  value={difficulty}
                  disabled={isGenerating}
                  onChange={(event) =>
                    setDifficulty(
                      event.target.value as QuizDifficulty,
                    )
                  }
                  className="mt-2 min-h-12 w-full cursor-pointer rounded-xl border border-input-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="facil">Fácil</option>
                  <option value="intermedia">Intermedia</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="quiz-question-count"
                  className="block text-sm font-medium"
                >
                  Cantidad de preguntas
                </label>

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
                  onChange={(event) =>
                    setQuestionCount(
                      Number(event.target.value),
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-input-border bg-background px-4 text-sm text-foreground focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-focus disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-input-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-5 text-muted">
                Las preguntas se generan utilizando RAG y Gemini.
                Esta operación puede consumir cuota de la API de IA.
              </p>

              <button
                type="submit"
                disabled={isGenerating}
                aria-busy={isGenerating}
                className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-[filter,transform,box-shadow] duration-200 enabled:hover:brightness-110 enabled:hover:shadow-lg enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 motion-reduce:transition-none"
              >
                {isGenerating ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                    />

                    Generando...
                  </>
                ) : (
                  <>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
                      <path d="M19 17v4M17 19h4" />
                    </svg>

                    Generar cuestionario
                  </>
                )}
              </button>
            </div>

            {isGenerating && (
              <p role="status" className="text-sm text-muted">
                StudyAI está preparando las preguntas. No cierres
                esta página mientras se procesa la solicitud.
              </p>
            )}

            {generationError && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-500"
              >
                {generationError}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

/**
 * Agrupa el listado y el generador.
 * Cuando se crea un quiz, actualiza los guardados.
 */
function DocumentQuizzes({
  documentId,
  filename,
}: {
  documentId: string;
  filename: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-8">
      <SavedQuizzes
        documentId={documentId}
        refreshKey={refreshKey}
      />

      <QuizGenerator
        documentId={documentId}
        filename={filename}
        onGenerated={() =>
          setRefreshKey((value) => value + 1)
        }
      />
    </div>
  );
}

function DocumentDetailContent() {
  const { id } = useParams<{ id: string }>();

  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [requestState, setRequestState] =
    useState<RequestState | null>(null);

  const initialLoadRef = useRef(true);
  const requestKey = `${id}:${offset}:${reloadKey}`;

  useLayoutEffect(() => {
    initialLoadRef.current = true;

    return () => {
      setRequestState(null);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = performance.now();
    const isInitialLoad = initialLoadRef.current;

    initialLoadRef.current = false;

    let revealTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadDocument() {
      try {
        const query = new URLSearchParams({
          limit: String(CHUNK_LIMIT),
          offset: String(offset),
        });

        const response = await fetch(
          `/api/documents/${encodeURIComponent(id)}?${query}`,
          {
            method: "GET",
            signal: controller.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (response.status === 401) {
            if (!controller.signal.aborted) await redirectExpiredSession();
            return;
          }

          if (response.status === 404) {
            throw new Error(
              "El documento no existe o no tienes acceso a él.",
            );
          }

          throw new Error(
            "No se pudo consultar el documento.",
          );
        }

        const data: DocumentDetailResponse =
          await response.json();

        if (
          !data.document ||
          !Array.isArray(data.chunks) ||
          typeof data.chunk_count !== "number"
        ) {
          throw new Error(
            "El servidor devolvió una respuesta inesperada.",
          );
        }

        const revealDocument = () => {
          if (controller.signal.aborted) return;

          startTransition(() => {
            setRequestState({
              key: requestKey,
              data,
              error: "",
            });
          });
        };

        const remaining = isInitialLoad
          ? Math.max(
              0,
              INITIAL_SKELETON_MS -
                (performance.now() - startedAt),
            )
          : 0;

        if (remaining > 0) {
          revealTimer = setTimeout(
            revealDocument,
            remaining,
          );
        } else {
          revealDocument();
        }
      } catch (caught) {
        if (controller.signal.aborted) return;

        startTransition(() => {
          setRequestState({
            key: requestKey,
            data: null,
            error:
              caught instanceof Error
                ? caught.message
                : "No se pudo cargar el documento.",
          });
        });
      }
    }

    void loadDocument();

    return () => {
      controller.abort();

      if (revealTimer !== undefined) {
        clearTimeout(revealTimer);
      }
    };
  }, [id, offset, reloadKey, requestKey]);

  const isLoading = requestState?.key !== requestKey;

  const data = !isLoading
    ? requestState?.data
    : null;

  const error = !isLoading
    ? requestState?.error
    : "";

  const document = data?.document;
  const chunks = data?.chunks ?? [];
  const totalChunks = data?.chunk_count ?? 0;

  const currentPage =
    Math.floor(offset / CHUNK_LIMIT) + 1;

  const totalPages = Math.max(
    1,
    Math.ceil(totalChunks / CHUNK_LIMIT),
  );

  return (
    <DocumentDetailLayout>
      <ViewTransition
        default="none"
        update="document-content"
      >
        {isLoading ? (
          <DocumentDetailSkeleton />
        ) : error ? (
          <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
            <h1 className="font-display text-xl font-semibold">
              No se pudo cargar el documento
            </h1>

            <p role="alert" className="mt-3 text-sm text-muted">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                setReloadKey((value) => value + 1)
              }
              className="mt-6 min-h-11 cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110"
            >
              Reintentar
            </button>
          </section>
        ) : document ? (
          <div className="space-y-8">
            <header>
              <p className="text-sm font-medium text-primary">
                Documento de estudio
              </p>

              <h1 className="mt-3 break-words font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {document.filename}
              </h1>

              <p className="mt-3 text-sm text-muted">
                Subido el {formatDate(document.created_at)}
              </p>
            </header>

            <section
              aria-label="Información del documento"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {[
                {
                  label: "Tamaño",
                  value: formatFileSize(
                    document.size_bytes,
                  ),
                },
                {
                  label: "Páginas con texto",
                  value: String(
                    document.pages_with_text,
                  ),
                },
                {
                  label: "Caracteres extraídos",
                  value:
                    document.text_length.toLocaleString(
                      "es-CR",
                    ),
                },
                {
                  label: "Fragmentos",
                  value: String(totalChunks),
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-input-border bg-surface p-5"
                >
                  <p className="text-sm text-muted">
                    {stat.label}
                  </p>

                  <p className="mt-3 font-display text-2xl font-semibold">
                    {stat.value}
                  </p>
                </div>
              ))}
            </section>

            {/* Cuestionarios existentes y generación */}
            <DocumentQuizzes
              key={document.id}
              documentId={document.id}
              filename={document.filename}
            />

            {/* Contenido extraído */}
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold">
                    Contenido extraído
                  </h2>

                  <p className="mt-2 text-sm text-muted">
                    Fragmentos de texto almacenados y procesados
                    por StudyAI.
                  </p>
                </div>

                <span className="text-sm text-muted">
                  Página {currentPage} de {totalPages}
                </span>
              </div>

              {chunks.length === 0 ? (
                <div className="rounded-2xl border border-input-border bg-surface p-8 text-center text-sm text-muted">
                  No hay fragmentos de texto disponibles.
                </div>
              ) : (
                <div className="space-y-4">
                  {chunks.map((chunk) => (
                    <article
                      key={chunk.id}
                      className="rounded-2xl border border-input-border bg-surface p-5 sm:p-6"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                          Fragmento {chunk.chunk_index}
                        </span>

                        {chunk.page_number !== null && (
                          <span className="text-xs text-muted">
                            Página {chunk.page_number}
                          </span>
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
                <nav
                  aria-label="Paginación de fragmentos"
                  className="mt-6 flex items-center justify-between gap-4"
                >
                  <button
                    type="button"
                    disabled={offset === 0}
                    onClick={() =>
                      setOffset((value) =>
                        Math.max(
                          0,
                          value - CHUNK_LIMIT,
                        ),
                      )
                    }
                    className="min-h-11 cursor-pointer rounded-xl border border-input-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors enabled:hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>

                  <span className="text-sm text-muted">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={
                      offset + CHUNK_LIMIT >= totalChunks
                    }
                    onClick={() =>
                      setOffset(
                        (value) => value + CHUNK_LIMIT,
                      )
                    }
                    className="min-h-11 cursor-pointer rounded-xl border border-input-border bg-surface px-5 py-2.5 text-sm font-medium transition-colors enabled:hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </nav>
              )}
            </section>
          </div>
        ) : null}
      </ViewTransition>
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
