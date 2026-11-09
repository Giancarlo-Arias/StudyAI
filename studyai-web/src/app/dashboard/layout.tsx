import { Suspense, ViewTransition, type ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth-server";
import { ThemeControl } from "@/components/auth/login-form";
import { LogoutButton } from "@/components/auth/logout-button";

import "../login/login.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const instant = false;

async function DashboardGuard({ children }: { children: ReactNode }) {
  await requireUser();

  return children;
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ViewTransition default="none" enter="dashboard-enter">
      <div className="dashboard-shell min-h-screen bg-background pb-[env(safe-area-inset-bottom)] text-foreground">
        <header className="sticky top-0 z-40 bg-background pt-[env(safe-area-inset-top)]">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-12">
            <Link
              href="/dashboard"
              className="font-display text-xl font-semibold tracking-tight text-foreground"
            >
              Study<span className="text-primary">AI</span>
            </Link>

            <div className="flex items-center gap-5 text-sm font-medium text-muted">
              <Link
                href="/dashboard"
                className="transition-colors hover:text-primary"
              >
                Resumen
              </Link>

              <Link
                href="/dashboard/documents"
                className="transition-colors hover:text-primary"
              >
                Documentos
              </Link>

              <Link
                href="/dashboard/quizzes"
                className="transition-colors hover:text-primary"
              >
                Cuestionarios
              </Link>

              <Link
                href="/dashboard/profile"
                className="transition-colors hover:text-primary"
              >
                Mi perfil
              </Link>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              <ThemeControl />

              <span
                aria-hidden="true"
                className="h-7 w-px bg-input-border"
              />

              <LogoutButton />
            </div>
          </nav>
        </header>

        <ViewTransition default="auto">
          <Suspense
            fallback={
              <main role="status" aria-label="Cargando página" className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
                <div aria-hidden="true" className="animate-pulse space-y-4 motion-reduce:animate-none">
                  <div className="h-4 w-36 rounded-full bg-surface-soft" />
                  <div className="h-10 w-64 max-w-full rounded-xl bg-surface-soft" />
                  <div className="h-4 w-80 max-w-full rounded-full bg-surface-soft" />
                  <div className="!mt-8 h-40 rounded-2xl border border-input-border bg-surface" />
                </div>
              </main>
            }
          >
            <DashboardGuard>{children}</DashboardGuard>
          </Suspense>
        </ViewTransition>
      </div>
    </ViewTransition>
  );
}
