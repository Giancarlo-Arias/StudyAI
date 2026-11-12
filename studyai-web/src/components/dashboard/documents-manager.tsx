"use client";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { getDocuments, uploadDocument, deleteDocument } from "@/lib/documents";

import { TrashIcon } from "@/assets/icons/trash";
import { DocumentsListSkeleton } from "@/components/dashboard/documents-skeleton";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import type { StudyDocument } from "@/types/documents";

const PAGE_SIZE = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function formatFileSize(bytes: number): string {
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

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DocumentsManager() {
  const [documents, setDocuments] = useState<StudyDocument[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [documentToDelete, setDocumentToDelete] = useState<StudyDocument | null>(null);

  const [deleteError, setDeleteError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const modalAnimationRef = useRef<Animation | null>(null);
  const isClosingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDocuments() {
      try {
        const data = await getDocuments(page * PAGE_SIZE, PAGE_SIZE + 1, controller.signal);

        if (controller.signal.aborted) return;

        setDocuments(data.documents.slice(0, PAGE_SIZE));
        setHasMore(data.documents.length > PAGE_SIZE);
      } catch {
        if (controller.signal.aborted) return;

        setDocuments([]);
        setHasMore(false);
        setError("No se pudo cargar la lista de documentos.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();

    return () => controller.abort();
  }, [page, reloadKey]);

  useEffect(() => {
    return () => {
      modalAnimationRef.current?.cancel();
    };
  }, []);

  function refreshDocuments(resetPage = false) {
    setIsLoading(true);

    if (resetPage) {
      setPage(0);
    }

    setReloadKey((value) => value + 1);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || isUploading) return;

    setError("");
    setNotice("");

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Selecciona un archivo PDF válido.");
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("El archivo debe tener un tamaño mayor que 0 y máximo de 5 MB.");
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadDocument(file);

      setNotice(`El documento "${result.filename}" se subió correctamente.`);

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      refreshDocuments(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo subir el PDF.");
    } finally {
      setIsUploading(false);
    }
  }

  function openDeleteDialog(document: StudyDocument) {
    const dialog = deleteDialogRef.current;

    if (!dialog || dialog.open || isClosingRef.current) return;

    setDocumentToDelete(document);
    setDeleteError("");
    setError("");
    setNotice("");

    dialog.showModal();

    if (prefersReducedMotion()) return;

    const animation = dialog.animate(
      [
        {
          opacity: 0,
          transform: "translateY(18px) scale(0.96)",
          filter: "blur(4px)",
        },
        {
          opacity: 1,
          transform: "translateY(0) scale(1)",
          filter: "blur(0px)",
        },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both",
      },
    );

    modalAnimationRef.current = animation;

    void animation.finished
      .then(() => {
        if (modalAnimationRef.current !== animation) return;

        modalAnimationRef.current = null;
        animation.cancel();
      })
      .catch(() => {});
  }

  function closeDeleteDialog(force = false) {
    const dialog = deleteDialogRef.current;

    if (!dialog || !dialog.open || isClosingRef.current) return;
    if (deletingId && !force) return;

    modalAnimationRef.current?.cancel();
    modalAnimationRef.current = null;

    if (prefersReducedMotion()) {
      dialog.close();
      return;
    }

    isClosingRef.current = true;

    const animation = dialog.animate(
      [
        {
          opacity: 1,
          transform: "translateY(0) scale(1)",
          filter: "blur(0px)",
        },
        {
          opacity: 0,
          transform: "translateY(10px) scale(0.985)",
          filter: "blur(3px)",
        },
      ],
      {
        duration: 180,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
        fill: "forwards",
      },
    );

    modalAnimationRef.current = animation;

    void animation.finished
      .then(() => {
        if (modalAnimationRef.current !== animation) return;

        dialog.close();
        animation.cancel();

        modalAnimationRef.current = null;
        isClosingRef.current = false;
      })
      .catch(() => {
        isClosingRef.current = false;
      });
  }

  async function handleConfirmDelete() {
    if (!documentToDelete || deletingId) return;

    const document = documentToDelete;

    setDeletingId(document.id);
    setDeleteError("");

    try {
      await deleteDocument(document.id);

      closeDeleteDialog(true);

      setNotice(`Documento "${document.filename}" eliminado correctamente.`);

      if (documents.length === 1 && page > 0) {
        setIsLoading(true);
        setPage((value) => value - 1);
      } else {
        refreshDocuments();
      }
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "No se pudo eliminar el PDF.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardReveal className="space-y-5" containerEntrance>
      <section className="workspace-panel p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span data-reveal-content="" className="workspace-file-symbol !h-11">
            <DashboardIcon name="upload" className="size-5" />
          </span>
          <div>
            <h2 data-reveal-content="" className="text-sm font-semibold">
              Añade tu próximo documento
            </h2>
            <p data-reveal-content="" className="mt-1 text-xs leading-5 text-muted">
              PDF con texto extraíble · Hasta 5 MB
            </p>
          </div>
        </div>

        <form
          data-reveal-content=""
          method="post"
          encType="multipart/form-data"
          onSubmit={handleUpload}
          className="mt-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              name="file"
              accept=".pdf,application/pdf"
              aria-label="Seleccionar documento PDF"
              required
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
                setNotice("");
              }}
              className="workspace-field min-w-0 flex-1 cursor-pointer !p-2.5 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:text-xs file:font-medium file:text-accent-foreground"
            />

            <button
              type="submit"
              disabled={!file || isUploading}
              className="workspace-action workspace-action-primary"
            >
              {isUploading ? (
                <span className="inline-flex items-center gap-3">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
                  Procesando PDF...
                </span>
              ) : (
                "Subir documento"
              )}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary"
        >
          {notice}
        </p>
      )}

      <section className="workspace-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-input-border p-5 sm:p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Mis documentos</h2>

            <p className="mt-1 text-sm text-muted">Archivos guardados en StudyAI.</p>
          </div>

          <span className="text-xs text-muted">Página {page + 1}</span>
        </div>

        {isLoading ? (
          <DocumentsListSkeleton />
        ) : documents.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">
            Todavía no tienes documentos en esta página.
          </p>
        ) : (
          <DashboardReveal
            key={page + ":" + documents.map((item) => item.id).join()}
            className="divide-y divide-border/60"
          >
            {documents.map((document) => (
              <article
                key={document.id}
                data-reveal=""
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="workspace-file-symbol">
                    <DashboardIcon name="document" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold">
                      <Link
                        href={`/dashboard/documents/${encodeURIComponent(document.id)}`}
                        className="rounded-sm transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        {document.filename}
                      </Link>
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-muted">
                      {formatFileSize(document.size_bytes)} · {document.pages_with_text} páginas con
                      texto · {formatDate(document.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
                  <Link
                    href={`/dashboard/documents/${encodeURIComponent(document.id)}`}
                    className="workspace-action"
                    aria-label={`Ver contenido de ${document.filename}`}
                  >
                    Ver contenido
                  </Link>

                  <button
                    type="button"
                    onClick={() => openDeleteDialog(document)}
                    disabled={deletingId !== null || isUploading}
                    className="min-h-10 shrink-0 cursor-pointer rounded-xl border border-red-500/25 px-4 py-2 text-sm font-medium text-red-500 transition-[background-color,transform] duration-200 hover:bg-red-500/10 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </DashboardReveal>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-input-border p-5">
          <button
            type="button"
            disabled={isLoading || page === 0}
            onClick={() => {
              setIsLoading(true);
              setPage((value) => value - 1);
            }}
            className="workspace-action"
          >
            Anterior
          </button>

          <span className="text-xs text-muted">Página {page + 1}</span>

          <button
            type="button"
            disabled={isLoading || !hasMore}
            onClick={() => {
              setIsLoading(true);
              setPage((value) => value + 1);
            }}
            className="workspace-action"
          >
            Siguiente
          </button>
        </div>
      </section>

      <dialog
        ref={deleteDialogRef}
        role="alertdialog"
        aria-labelledby="delete-document-title"
        aria-describedby="delete-document-description"
        onClose={() => {
          setDocumentToDelete(null);
          setDeleteError("");
          isClosingRef.current = false;
        }}
        onCancel={(event) => {
          event.preventDefault();

          if (!deletingId) {
            closeDeleteDialog();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDeleteDialog();
          }
        }}
        className="
          m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)]
          max-w-[460px] overflow-y-auto rounded-3xl
          border border-input-border bg-surface p-0
          text-foreground shadow-2xl
          backdrop:bg-slate-950/35
          backdrop:backdrop-blur-xl
        "
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-red-500/15 bg-red-500/10 text-red-500">
              <TrashIcon className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-500">
                Acción irreversible
              </p>

              <h2
                id="delete-document-title"
                className="mt-1 font-display text-xl font-semibold tracking-tight"
              >
                Eliminar documento
              </h2>
            </div>
          </div>

          <p id="delete-document-description" className="mt-6 text-sm leading-6 text-muted">
            ¿Estás seguro de que deseas eliminar este documento de tu biblioteca?
          </p>

          <div className="mt-4 rounded-xl border border-input-border bg-surface-soft px-4 py-3">
            <p className="break-words text-sm font-medium leading-6 text-foreground">
              {documentToDelete?.filename}
            </p>
          </div>

          <p className="mt-3 text-xs leading-5 text-muted">
            Se eliminarán los datos asociados al documento. Esta acción no se puede deshacer.
          </p>

          {deleteError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-500"
            >
              {deleteError}
            </p>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => closeDeleteDialog()}
              disabled={deletingId !== null}
              className="workspace-action"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deletingId !== null}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-[background-color,transform,box-shadow] duration-200 hover:bg-red-700 hover:shadow-lg enabled:active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              {deletingId ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent motion-reduce:animate-none" />
                  Eliminando...
                </>
              ) : (
                "Eliminar documento"
              )}
            </button>
          </div>
        </div>
      </dialog>
    </DashboardReveal>
  );
}
