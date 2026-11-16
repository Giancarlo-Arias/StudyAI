import { Suspense, ViewTransition, type ReactNode } from "react";
import type { Viewport } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth-server";
import { ThemeControl } from "@/components/auth/login-form";
import {
  DashboardNavigation,
  DashboardNavigationFallback,
  SidebarToggle,
} from "@/components/dashboard/dashboard-navigation";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { DashboardLoading } from "@/components/dashboard/dashboard-loading";
import { DashboardMotionScope } from "@/components/dashboard/dashboard-reveal";
import { DashboardSilk } from "@/components/dashboard/dashboard-silk";

import "../login/login.css";
import "./dashboard.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

async function DashboardGuard({ children }: { children: ReactNode }) {
  await requireUser();
  return <DashboardMotionScope>{children}</DashboardMotionScope>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ViewTransition default="none" enter="dashboard-enter">
      <div className="dashboard-shell">
        <DashboardSilk />
        <a href="#workspace-content" className="workspace-skip">
          Ir al contenido
        </a>

        <Suspense fallback={<DashboardNavigationFallback />}>
          <DashboardNavigation />
        </Suspense>

        <div className="workspace-frame">
          <header className="workspace-header">
            <div className="workspace-header-inner navigation-glass">
              <SidebarToggle />
              <Link
                href="/dashboard"
                className="workspace-mobile-brand"
                aria-label="StudyAI, ir al resumen"
              >
                <span className="workspace-brand-mark">
                  <DashboardIcon name="book" className="size-5" />
                </span>
                <span>StudyAI</span>
              </Link>
              <div className="workspace-breadcrumb">
                <DashboardIcon name="overview" className="size-4" />
                <span>Mi espacio de estudio</span>
              </div>
              <div className="workspace-header-controls">
                <ThemeControl />
                <Link
                  href="/dashboard/profile"
                  className="workspace-header-profile"
                  aria-label="Abrir mi perfil"
                >
                  <DashboardIcon name="profile" className="size-[18px]" />
                </Link>
              </div>
            </div>
          </header>

          <div id="workspace-content" className="workspace-content" tabIndex={-1}>
            <Suspense
              fallback={
                <main>
                  <DashboardLoading />
                </main>
              }
            >
              <DashboardGuard>{children}</DashboardGuard>
            </Suspense>
          </div>
        </div>
      </div>
    </ViewTransition>
  );
}
