import { DashboardBackLink } from "@/components/dashboard/dashboard-navigation";
import { DocumentDetailSkeleton } from "@/components/dashboard/documents-skeleton";

export default function LoadingDocument() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <DashboardBackLink href="/dashboard/documents">Volver a mis documentos</DashboardBackLink>
      <div className="mt-8">
        <DocumentDetailSkeleton />
      </div>
    </main>
  );
}
