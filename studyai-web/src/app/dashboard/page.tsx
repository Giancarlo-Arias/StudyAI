import { Suspense } from "react";
import { requireUser } from "@/lib/auth-server";
import { getDashboardData } from "@/lib/dashboard";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";

async function DashboardContent() {
  const user = await requireUser();
  const dashboard = await getDashboardData();

  return <DashboardOverview dashboard={dashboard} fullName={user.full_name} />;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main>
          <DashboardLoading label="Conectando tu aprendizaje" />
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
