export function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando perfil"
      className="animate-pulse space-y-8 motion-reduce:animate-none"
    >
      <div className="space-y-4">
        <div className="h-4 w-32 rounded-full bg-surface-soft" />
        <div className="h-10 w-52 rounded-xl bg-surface-soft" />
        <div className="h-4 w-80 max-w-full rounded-full bg-surface-soft" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
          <div className="h-7 w-56 rounded-lg bg-surface-soft" />
          <div className="mt-2 h-6 w-72 max-w-full rounded-full bg-surface-soft" />

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-full bg-surface-soft" />
              <div className="h-12 rounded-xl bg-surface-soft" />
              <div className="h-4 w-40 max-w-full rounded-full bg-surface-soft" />
            </div>

            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-surface-soft" />
              <div className="h-12 rounded-xl bg-surface-soft" />
              <div className="h-4 w-64 max-w-full rounded-full bg-surface-soft" />
            </div>

            <div className="border-t border-input-border pt-6">
              <div className="h-11 w-40 rounded-xl bg-surface-soft" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-input-border bg-surface p-6">
          <div className="size-14 rounded-full bg-surface-soft" />
          <div className="mt-5 h-5 w-40 rounded-lg bg-surface-soft" />
          <div className="mt-2 h-5 w-48 max-w-full rounded-full bg-surface-soft" />
        </div>
      </div>
    </div>
  );
}

