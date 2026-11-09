import Link from "next/link";
import { DocumentDetailSkeleton } from "@/components/dashboard/documents-skeleton";

export default function LoadingDocument() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
      >
        <span aria-hidden="true">←</span>
        Volver a mis documentos
      </Link>
      <div className="mt-8">
        <DocumentDetailSkeleton />
      </div>
    </main>
  );
}
