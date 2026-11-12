export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Cargando tu perfil" className="workspace-profile-content">
      <span className="sr-only">Cargando tu perfil</span>
      <div aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
        <div className="mb-5">
          <div className="h-8 w-36 rounded-lg bg-surface-soft" />
          <div className="mt-3 h-5 w-80 max-w-full rounded-md bg-surface-soft" />
        </div>
        <div className="workspace-panel workspace-profile-summary">
          <div className="size-12 shrink-0 rounded-2xl bg-surface-soft" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-36 max-w-full rounded-md bg-surface-soft" />
            <div className="h-4 w-48 max-w-full rounded-md bg-surface-soft" />
          </div>
        </div>
        <div className="mt-5 h-12 w-full max-w-md rounded-xl bg-surface-soft" />
        <div className="workspace-panel mt-5 overflow-hidden">
          <div className="border-b border-border p-6">
            <div className="h-6 w-64 max-w-full rounded-md bg-surface-soft" />
            <div className="mt-3 h-4 w-80 max-w-full rounded-md bg-surface-soft" />
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {[1, 2].map((field) => (
              <div key={field}>
                <div className="h-4 w-28 rounded-md bg-surface-soft" />
                <div className="mt-3 h-5 w-44 max-w-full rounded-md bg-surface-soft" />
              </div>
            ))}
          </div>
          <div className="mx-6 mb-6 h-11 w-44 rounded-xl bg-surface-soft" />
        </div>
      </div>
    </div>
  );
}
