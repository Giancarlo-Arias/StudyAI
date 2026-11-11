"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentProps } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardIcon, type DashboardIconName } from "./dashboard-icon";

const destinations: { href: string; label: string; shortLabel: string; icon: DashboardIconName }[] =
  [
    { href: "/dashboard", label: "Resumen", shortLabel: "Resumen", icon: "overview" },
    {
      href: "/dashboard/documents",
      label: "Documentos",
      shortLabel: "Documentos",
      icon: "document",
    },
    {
      href: "/dashboard/quizzes",
      label: "Cuestionarios",
      shortLabel: "Pruebas",
      icon: "quiz",
    },
    { href: "/dashboard/profile", label: "Mi perfil", shortLabel: "Perfil", icon: "profile" },
  ];

function NavigationContent({ pathname }: { pathname?: string }) {
  const collapsed = useSyncExternalStore(subscribeSidebar, sidebarSnapshot, () => false);
  const links = (variant: "sidebar" | "dock") =>
    destinations.map((item) => {
      const active =
        item.href === "/dashboard"
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(item.href + "/");
      return (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active ? "page" : undefined}
          className="workspace-nav-link"
          aria-label={item.label}
        >
          {active && (
            <span
              className={"workspace-nav-lens workspace-nav-lens--" + variant}
              aria-hidden="true"
            />
          )}
          <DashboardIcon name={item.icon} className="size-[19px]" />
          <span className="workspace-nav-label">{item.label}</span>
          <span className="workspace-nav-short">{item.shortLabel}</span>
          {active && <span className="workspace-nav-dot" aria-hidden="true" />}
        </Link>
      );
    });

  return (
    <>
      <aside
        id="workspace-sidebar"
        className="workspace-sidebar navigation-glass navigation-glass--sidebar"
        inert={collapsed}
      >
        <div className="workspace-sidebar-heading">
          <Link href="/dashboard" className="workspace-brand" aria-label="StudyAI, ir al resumen">
            <span className="workspace-brand-mark">
              <DashboardIcon name="book" className="size-[22px]" />
            </span>
            <span>
              Study<span className="font-normal opacity-60">AI</span>
            </span>
          </Link>
          <SidebarToggle placement="sidebar" />
        </div>
        <p className="workspace-sidebar-label">Tu espacio</p>
        <nav aria-label="Navegación principal" className="workspace-navigation">
          {links("sidebar")}
        </nav>
        <div className="workspace-sidebar-footer">
          <div className="workspace-sidebar-note">
            <span className="workspace-status-dot" aria-hidden="true" />
            <span>Aprende a tu manera.</span>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <nav aria-label="Navegación móvil" className="workspace-mobile-navigation navigation-glass">
        {links("dock")}
      </nav>
    </>
  );
}

export function DashboardNavigationFallback() {
  return <NavigationContent />;
}

export function DashboardNavigation() {
  const pathname = usePathname();
  return <NavigationContent pathname={pathname} />;
}

export function DashboardBackLink({
  children,
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={"workspace-back-link " + className}>
      <span className="workspace-back-icon">
        <DashboardIcon name="chevron" className="size-3.5" />
      </span>
      <span>{children}</span>
    </Link>
  );
}

function sidebarSnapshot() {
  return document.documentElement.dataset.sidebar === "collapsed";
}

function saveSidebar(collapsed: boolean) {
  try {
    localStorage.setItem("studyai-sidebar", collapsed ? "collapsed" : "expanded");
  } catch {
    return;
  }
}

function subscribeSidebar(listener: () => void) {
  const sync = (event: StorageEvent) => {
    if (event.key !== "studyai-sidebar" && event.key !== null) return;
    if (event.newValue === "collapsed") document.documentElement.dataset.sidebar = "collapsed";
    else document.documentElement.removeAttribute("data-sidebar");
    listener();
  };
  window.addEventListener("studyai-sidebar-change", listener);
  window.addEventListener("storage", sync);
  return () => {
    window.removeEventListener("studyai-sidebar-change", listener);
    window.removeEventListener("storage", sync);
  };
}

export function SidebarToggle({ placement = "header" }: { placement?: "header" | "sidebar" }) {
  const collapsed = useSyncExternalStore(subscribeSidebar, sidebarSnapshot, () => false);
  return (
    <button
      type="button"
      className={"workspace-sidebar-toggle workspace-sidebar-toggle--" + placement}
      aria-label={collapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
      aria-expanded={!collapsed}
      aria-controls="workspace-sidebar"
      onClick={(event) => {
        const root = document.documentElement;
        const animate =
          event.detail !== 0 &&
          document.visibilityState !== "hidden" &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        root.classList.toggle("sidebar-user-interaction", animate);
        const nextCollapsed = root.dataset.sidebar !== "collapsed";
        if (nextCollapsed) root.dataset.sidebar = "collapsed";
        else root.removeAttribute("data-sidebar");
        const sidebar = document.getElementById("workspace-sidebar");
        if (sidebar) sidebar.inert = nextCollapsed;
        saveSidebar(nextCollapsed);
        window.dispatchEvent(new Event("studyai-sidebar-change"));
        document
          .querySelector<HTMLButtonElement>(
            nextCollapsed
              ? ".workspace-sidebar-toggle--header"
              : ".workspace-sidebar-toggle--sidebar",
          )
          ?.focus({ preventScroll: true });
      }}
    >
      <DashboardIcon name="sidebar" className={"size-[19px] " + (collapsed ? "rotate-180" : "")} />
    </button>
  );
}
