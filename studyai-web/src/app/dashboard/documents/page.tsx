import { Suspense } from "react";
import { requireUser } from "@/lib/auth-server";
import { DocumentsManager } from "@/components/dashboard/documents-manager";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";

async function DocumentsContent() {
  await requireUser();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">Biblioteca de estudio</p>

        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          Mis documentos
        </h1>

        <p className="mt-3 text-sm text-muted">
          Organiza los PDF que utilizarás para estudiar y generar cuestionarios.
        </p>
      </div>

      <DocumentsManager />
    </main>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <main>
          <DashboardLoading label="Preparando tu biblioteca" />
        </main>
      }
    >
      <DocumentsContent />
    </Suspense>
  );
}
