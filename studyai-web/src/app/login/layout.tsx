import { Suspense, ViewTransition, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-server";
import { ThemeControl } from "@/components/auth/login-form";
import "./login.css";

async function LoginGuard({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return children;
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <ViewTransition default="none" exit={{ "login-dashboard": "login-exit", default: "none" }}>
      <div className="login-scene flex min-h-svh flex-1 flex-col px-[max(1rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] pb-[max(5.5rem,env(safe-area-inset-bottom))] sm:px-[max(2rem,env(safe-area-inset-left),env(safe-area-inset-right))] sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <a
          className="fixed top-3 left-5 z-10 -translate-y-24 rounded-lg bg-surface px-4 py-3 text-sm focus:translate-y-0"
          href="#login-email"
        >
          Ir al formulario
        </a>

        <header className="mx-auto flex min-h-20 w-full max-w-[960px] items-center justify-between gap-3 sm:min-h-24">
          <div
            className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"
            aria-label="StudyAI"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
              className="text-accent-foreground"
            >
              <path
                d="M5 7.5c3.4-1 6-.3 9 2.2 3-2.5 5.6-3.2 9-2.2v15c-3.4-1-6-.3-9 2.2-3-2.5-5.6-3.2-9-2.2v-15Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="M14 10v14M10 3l4 3 4-3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

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
