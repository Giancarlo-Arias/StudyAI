import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailForm } from "@/components/auth/verify-email-form";


export const metadata: Metadata = {
  title: "Verificar correo",
  description: "Verifica tu cuenta de StudyAI con un código de seis dígitos.",
};


type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string | string[];
  }>;
};


async function VerificationFormWithEmail({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;

  const initialEmail =
    typeof params.email === "string"
      ? params.email
      : "";

  return <VerifyEmailForm initialEmail={initialEmail} />;
}

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {

  return (
    <>
      <main className="mx-auto flex w-full max-w-[960px] flex-1 items-center justify-center py-4 sm:py-6">
        <div className="grid w-full max-w-[500px] items-center gap-12 lg:max-w-none lg:grid-cols-[1.2fr_1fr]">
          <section
            className="login-glass login-enter min-w-0 rounded-[24px] px-5 py-7 sm:rounded-[28px] sm:px-10 sm:py-11"
            aria-labelledby="verification-title"
          >
            <h1
              id="verification-title"
              className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2rem]"
            >
              Verifica tu correo.
            </h1>

            <p className="mt-3 text-[15px] leading-6 text-muted">
              Te enviamos un código de 6 dígitos para confirmar
              tu correo electrónico y activar tu cuenta.
            </p>

            <Suspense fallback={null}>
              <VerificationFormWithEmail searchParams={searchParams} />
            </Suspense>
          </section>

          <aside
            className="hidden min-w-0 flex-col justify-center py-8 pr-2 lg:flex"
            aria-labelledby="verification-aside-title"
          >
            <h2
              id="verification-aside-title"
              className="font-display text-2xl leading-snug font-medium tracking-tight"
            >
              Un paso más.
              <br />
              Tu espacio de estudio te espera.
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted">
              Confirma tu correo para acceder a tus documentos
              y comenzar a aprender con StudyAI.
            </p>

            <div className="study-example mt-7 rounded-2xl bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-xl text-accent-foreground">
                  ✉
                </span>

                <div>
                  <p className="text-sm font-semibold">
                    Verificación segura
                  </p>

                  <p className="text-xs text-muted">
                    Código temporal de 6 dígitos
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-muted">
                Tu código es personal, vence en 5 minutos
                y solo puede utilizarse una vez.
              </p>
            </div>
          </aside>
        </div>
      </main>

      <footer className="flex min-h-12 items-center justify-center text-xs text-muted sm:min-h-16">
        StudyAI · Tu espacio de aprendizaje
      </footer>
    </>
  );
}
