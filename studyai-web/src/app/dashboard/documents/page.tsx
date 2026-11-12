import { Suspense } from "react";
import { requireUser } from "@/lib/auth-server";
import { DocumentsManager } from "@/components/dashboard/documents-manager";
import { DocumentsPageSkeleton } from "@/components/dashboard/documents-skeleton";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";

async function DocumentsContent() {
  await requireUser();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <DashboardReveal className="mb-6" containerEntrance>
        <header>
          <p data-reveal="text" className="text-sm font-medium text-primary">
            Biblioteca de estudio
          </p>

          <h1
            data-reveal="text"
            className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
          >
            Mis documentos
          </h1>

          <p data-reveal="text" className="mt-3 text-sm text-muted">
            Organiza los PDF que utilizarás para estudiar y generar cuestionarios.
          </p>
        </header>
      </DashboardReveal>

      <DocumentsManager />
    </main>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <main>
          <DocumentsPageSkeleton />
        </main>
      }
    >
      <DocumentsContent />
    </Suspense>
  );
}
