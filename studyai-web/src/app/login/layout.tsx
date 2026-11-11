import { Suspense, ViewTransition, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { navigation } from "next/cache";
import { getSessionUser } from "@/lib/auth-server";
import { ThemeControl } from "@/components/auth/login-form";
import { AmbientField } from "@/components/ambient-field";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import "./login.css";

async function LoginGuard({ children }: { children: ReactNode }) {
  await navigation();
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return children;
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <ViewTransition default="none" exit={{ "login-dashboard": "login-exit", default: "none" }}>
      <div className="login-scene flex min-h-svh flex-1 flex-col px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-[max(2rem,env(safe-area-inset-left),env(safe-area-inset-right))] sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AmbientField variant="auth" />
        <a
          className="fixed top-3 left-5 z-10 -translate-y-24 rounded-lg bg-surface px-4 py-3 text-sm focus:translate-y-0"
          href="#login-email"
        >
          Ir al formulario
        </a>

        <header className="login-navigation navigation-glass">
          <div className="login-navigation-brand font-display font-semibold" aria-label="StudyAI">
            <span className="login-brand-mark">
              <DashboardIcon name="book" className="size-5" />
            </span>

            <span>
              Study<span className="font-medium">AI</span>
            </span>
          </div>

          <ThemeControl />
        </header>

        <Suspense fallback={null}>
          <LoginGuard>{children}</LoginGuard>
        </Suspense>
      </div>
    </ViewTransition>
  );
}
