export function QuizzesSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando cuestionarios"
      className="animate-pulse space-y-8 motion-reduce:animate-none"
    >
      <div className="space-y-4">
        <div className="h-4 w-36 rounded-full bg-surface-soft" />
        <div className="h-10 w-72 max-w-full rounded-xl bg-surface-soft" />
        <div className="h-4 w-80 max-w-full rounded-full bg-surface-soft" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {["total", "questions"].map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-input-border bg-surface p-6"
          >
            <div className="h-4 w-36 rounded-full bg-surface-soft" />
            <div className="mt-4 h-9 w-20 rounded-lg bg-surface-soft" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="h-7 w-52 rounded-lg bg-surface-soft" />
        <div className="h-4 w-72 max-w-full rounded-full bg-surface-soft" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {["quiz-a", "quiz-b", "quiz-c", "quiz-d"].map(
          (item) => (
            <div
              key={item}
              className="rounded-2xl border border-input-border bg-surface p-6"
            >
              <div className="flex justify-between gap-4">
                <div className="h-6 w-28 rounded-full bg-surface-soft" />
                <div className="h-4 w-28 rounded-full bg-surface-soft" />
              </div>

              <div className="mt-6 space-y-3">
                <div className="h-6 w-4/5 rounded-lg bg-surface-soft" />
                <div className="h-4 w-2/3 rounded-full bg-surface-soft" />
              </div>

              <div className="mt-8 flex flex-wrap gap-3 border-t border-input-border pt-5">
                <div className="h-11 w-28 rounded-xl bg-surface-soft" />
                <div className="h-11 w-32 rounded-xl bg-surface-soft" />
                <div className="h-11 w-28 rounded-xl bg-surface-soft" />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

