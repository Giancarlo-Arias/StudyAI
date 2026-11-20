
import { Suspense } from "react";
import { requireUser } from "@/lib/auth-server";
import { getDashboardData, getTopicProgress } from "@/lib/dashboard";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";
import { TopicProgressSection } from "@/components/dashboard/topic-progress-section";

async function TopicProgressContent() {
  const topicProgress = await getTopicProgress();
  return <TopicProgressSection topics={topicProgress?.topics ?? null} />;
}

async function DashboardContent() {
  const user = await requireUser();
  const dashboard = await getDashboardData();

  return (
    <DashboardOverview dashboard={dashboard} fullName={user.full_name} topicSection={
      <Suspense key="topic-progress" fallback={<section role="status" aria-label="Cargando rendimiento por tema" className="workspace-panel mt-5 p-5"><div aria-hidden="true" className="animate-pulse space-y-4 motion-reduce:animate-none"><div className="h-5 w-48 rounded-md bg-surface-soft" /><div className="h-12 rounded-lg bg-surface-soft" /></div></section>}>
        <TopicProgressContent />
      </Suspense>
    } />
  );
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
