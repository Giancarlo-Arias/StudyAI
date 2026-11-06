import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeControl } from "@/components/auth/login-form";
import { LogoutButton } from "@/components/auth/logout-button";

import "../login/login.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-input-border bg-background/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:px-12">
          <Link href="/dashboard" className="font-display text-xl font-semibold tracking-tight text-foreground">
            Study<span className="text-primary">AI</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            <ThemeControl />
            <span aria-hidden="true" className="h-7 w-px bg-input-border" />
            <LogoutButton />
          </div>
        </nav>
      </header>

      {children}
    </div>
  );
}