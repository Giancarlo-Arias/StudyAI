export function DashboardLoading({ label = "Preparando tu espacio" }: { label?: string }) {
  return (
    <div className="workspace-loading" role="status" aria-live="polite">
      <div className="workspace-loading-pulse" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </div>
  );
}
