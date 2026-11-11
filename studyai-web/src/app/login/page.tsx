import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginFeatures } from "@/components/auth/login-features";
import { LoginForm } from "@/components/auth/login-form";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu espacio de estudio en StudyAI.",
};

type LoginPageProps = {
  searchParams: Promise<{
    verified?: string | string[];
  }>;
};

async function LoginFormWithVerification({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  return <LoginForm verified={params.verified === "1"} />;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[1040px] flex-1 items-center justify-center py-5 sm:py-7">
        <div className="grid w-full max-w-[440px] items-center gap-12 lg:max-w-none lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-20">
          <section
            className="login-glass login-enter min-w-0 rounded-[26px] px-5 py-7 sm:px-8 sm:py-9"
            aria-labelledby="login-title"
          >
            <div className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-accent-foreground">
              <DashboardIcon name="spark" className="size-4" />
              Tu espacio de estudio
            </div>
            <h1
              id="login-title"
              className="font-display text-[1.65rem] leading-tight font-semibold tracking-[-0.04em] sm:text-[1.85rem]"
            >
              Bienvenido de nuevo.
            </h1>

            <p className="mt-2 text-[15px] leading-6 text-muted sm:mt-3">
              Continúa donde lo dejaste.
            </p>

            <Suspense fallback={null}>
              <LoginFormWithVerification searchParams={searchParams} />
            </Suspense>
          </section>

          <LoginFeatures />
        </div>
      </main>

      <footer className="flex min-h-12 items-center justify-center text-xs text-muted sm:min-h-16">
        StudyAI · Tu espacio de aprendizaje
      </footer>
    </>
  );
}
