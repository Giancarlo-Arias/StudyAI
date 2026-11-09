import { Suspense, ViewTransition } from "react";
import { requireUser } from "@/lib/auth-server";
import { DocumentsManager } from "@/components/dashboard/documents-manager";
import { DocumentsPageSkeleton } from "@/components/dashboard/documents-skeleton";

async function DocumentsContent() {
  await requireUser();

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          Biblioteca de estudio
        </p>

        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
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
    <ViewTransition default="none" update="loading-reveal">
      <Suspense fallback={<DocumentsPageSkeleton />}>
        <DocumentsContent />
      </Suspense>
    </ViewTransition>
  );
}
