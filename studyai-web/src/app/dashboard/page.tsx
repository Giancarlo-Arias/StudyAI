import { Suspense } from "react";
import { requireUser } from "@/lib/auth-server";

async function DashboardContent() {
  const user = await requireUser();

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-4">Bienvenido, {user.full_name}.</p>
      <p className="mt-2 text-sm text-muted">{user.email}</p>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-8">Verificando sesión...</p>}>
      <DashboardContent />
    </Suspense>
  );
}