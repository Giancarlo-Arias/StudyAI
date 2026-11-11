export function QuizzesSkeleton() {
  return (
    <div role="status" aria-label="Cargando cuestionarios" className="space-y-5">
      <span className="sr-only">Cargando cuestionarios</span>
      <div aria-hidden="true" className="animate-pulse space-y-5 motion-reduce:animate-none">
        <div className="space-y-3">
          <div className="h-4 w-36 rounded-md bg-surface-soft" />
          <div className="h-8 w-60 max-w-full rounded-lg bg-surface-soft" />
          <div className="h-4 w-80 max-w-full rounded-md bg-surface-soft" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {["quizzes", "questions"].map((item) => (
            <div
              key={item}
              className="workspace-panel flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="h-4 w-36 max-w-full rounded-md bg-surface-soft" />
              <div className="h-7 w-10 shrink-0 rounded-md bg-surface-soft" />
            </div>
          ))}
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-6 w-48 rounded-md bg-surface-soft" />
          <div className="h-4 w-72 max-w-full rounded-md bg-surface-soft" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {["quiz-a", "quiz-b"].map((item) => (
            <div key={item} className="workspace-panel space-y-5 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="h-7 w-28 rounded-lg bg-surface-soft" />
                <div className="h-3 w-20 rounded-md bg-surface-soft" />
              </div>
              <div className="h-6 w-4/5 rounded-md bg-surface-soft" />
              <div className="flex flex-wrap gap-3 border-t border-border/60 pt-5">
                <div className="h-11 w-24 rounded-xl bg-surface-soft" />
                <div className="h-11 w-28 rounded-xl bg-surface-soft" />
                <div className="h-11 w-32 rounded-xl bg-surface-soft" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
