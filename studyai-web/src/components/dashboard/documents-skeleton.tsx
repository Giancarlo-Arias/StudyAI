const skeletonRows = ["document-a", "document-b", "document-c"] as const;

export function DocumentsPageSkeleton() {
  return (
    <div role="status" aria-label="Cargando biblioteca" className="space-y-5">
      <span className="sr-only">Cargando biblioteca</span>
      <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        <div className="h-4 w-36 rounded-md bg-surface-soft" />
        <div className="mt-3 h-8 w-56 rounded-lg bg-surface-soft" />
        <div className="mt-3 h-5 w-full max-w-lg rounded-md bg-surface-soft" />
      </div>
      <div
        aria-hidden="true"
        className="workspace-panel animate-pulse p-5 motion-reduce:animate-none sm:p-6"
      >
        <div className="flex items-center gap-3">
          <div className="size-11 shrink-0 rounded-xl bg-surface-soft" />
          <div className="min-w-0 flex-1">
            <div className="h-4 w-52 max-w-full rounded-md bg-surface-soft" />
            <div className="mt-2 h-4 w-64 max-w-full rounded-md bg-surface-soft" />
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row">
          <div className="h-12 flex-1 rounded-xl bg-surface-soft" />
          <div className="h-12 w-full rounded-xl bg-surface-soft sm:w-40" />
        </div>
      </div>
      <div className="workspace-panel overflow-hidden">
        <div
          aria-hidden="true"
          className="animate-pulse border-b border-border p-5 motion-reduce:animate-none"
        >
          <div className="h-6 w-44 rounded-md bg-surface-soft" />
          <div className="mt-2 h-4 w-52 rounded-md bg-surface-soft" />
        </div>
        <DocumentsListSkeleton />
      </div>
    </div>
  );
}

export function DocumentDetailSkeleton() {
  return (
    <div role="status" aria-label="Cargando documento">
      <span className="sr-only">Cargando documento...</span>

      <div aria-hidden="true" className="animate-pulse space-y-6 motion-reduce:animate-none">
        <div>
          <div className="h-5 w-36 rounded-md bg-surface-soft" />
          <div className="mt-3 h-9 w-3/4 max-w-xl rounded-lg bg-surface-soft sm:h-10" />
          <div className="mt-3 h-5 w-52 max-w-full rounded-md bg-surface-soft" />
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {["size", "pages", "text", "chunks"].map((item) => (
            <div key={item} className="workspace-panel px-4 py-3.5">
              <div className="h-5 w-28 max-w-full rounded-md bg-surface-soft" />
              <div className="mt-2 h-6 w-20 rounded-lg bg-surface-soft" />
            </div>
          ))}
        </div>

        <div className="space-y-5">
          <div>
            <div className="h-5 w-44 rounded-md bg-surface-soft" />
            <div className="mt-2 h-8 w-52 max-w-full rounded-lg bg-surface-soft" />
            <div className="mt-2 h-6 w-full max-w-xl rounded-md bg-surface-soft" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {["quiz-a", "quiz-b"].map((item) => (
              <div key={item} className="workspace-panel p-5">
                <div className="h-3 w-24 rounded-full bg-surface-soft" />
                <div className="mt-5 h-5 w-4/5 rounded-lg bg-surface-soft" />
                <div className="mt-3 h-3 w-1/2 rounded-full bg-surface-soft" />
                <div className="mt-6 h-11 w-36 rounded-xl bg-surface-soft" />
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-surface">
          <div className="border-b border-input-border bg-accent-soft px-5 py-6 sm:px-7">
            <div className="h-4 w-48 max-w-full rounded-md bg-surface-soft" />
            <div className="mt-2 h-7 w-56 max-w-full rounded-lg bg-surface-soft sm:h-8" />
            <div className="mt-2 h-6 w-full max-w-2xl rounded-md bg-surface-soft" />
          </div>

          <div className="space-y-6 p-5 sm:p-7">
            <div>
              <div className="h-5 w-40 rounded-md bg-surface-soft" />
              <div className="mt-2 h-[54px] rounded-xl bg-surface-soft" />
              <div className="mt-2 h-5 w-64 max-w-full rounded-md bg-surface-soft" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {["difficulty", "questions"].map((item) => (
                <div key={item}>
                  <div className="h-5 w-32 rounded-md bg-surface-soft" />
                  <div
                    className={`mt-2 h-[54px] rounded-[14px] bg-surface-soft ${item === "difficulty" ? "max-[399px]:h-[66px]" : ""}`}
                  />
                  <div className="mt-2 h-5 w-44 max-w-full rounded-md bg-surface-soft" />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4 border-t border-input-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="h-10 w-full max-w-md rounded-md bg-surface-soft" />
              <div className="h-12 w-full rounded-xl bg-surface-soft sm:w-52 sm:shrink-0" />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="h-8 w-56 max-w-full rounded-lg bg-surface-soft" />
              <div className="mt-2 h-5 w-80 max-w-full rounded-md bg-surface-soft" />
            </div>
            <div className="h-5 w-24 rounded-md bg-surface-soft" />
          </div>

          <div className="space-y-4">
            <div className="workspace-panel p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-7 w-24 rounded-lg bg-accent-soft" />
                <div className="h-4 w-16 rounded-md bg-surface-soft" />
              </div>
              <div className="mt-5 space-y-3.5">
                <div className="h-3.5 w-full rounded-md bg-surface-soft" />
                <div className="h-3.5 w-11/12 rounded-md bg-surface-soft" />
                <div className="h-3.5 w-4/5 rounded-md bg-surface-soft" />
                <div className="h-3.5 w-2/3 rounded-md bg-surface-soft" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentsListSkeleton() {
  return (
    <div role="status" aria-label="Cargando documentos" className="divide-y divide-input-border">
      <span className="sr-only">Cargando documentos...</span>

      {skeletonRows.map((id) => (
        <div key={id} aria-hidden="true" className="flex items-center justify-between gap-5 p-5">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-4 w-3/4 max-w-sm animate-pulse rounded-md bg-surface-soft motion-reduce:animate-none" />
            <div className="h-3 w-1/2 max-w-56 animate-pulse rounded-md bg-surface-soft motion-reduce:animate-none" />
          </div>

          <div className="hidden h-9 w-20 animate-pulse rounded-xl bg-surface-soft motion-reduce:animate-none sm:block" />
        </div>
      ))}
    </div>
  );
}

