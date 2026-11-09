import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu espacio de estudio en StudyAI.",
};

export default function LoginPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[960px] flex-1 items-center justify-center py-4 sm:py-6">
        <div className="grid w-full max-w-[500px] items-center gap-12 lg:max-w-none lg:grid-cols-[1.2fr_1fr]">
          <section
            className="login-glass login-enter min-w-0 rounded-[24px] px-5 py-7 sm:rounded-[28px] sm:px-10 sm:py-11"
            aria-labelledby="login-title"
          >
            <h1
              id="login-title"
              className="font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.035em] sm:text-[2rem]"
            >
              Bienvenido de nuevo.
            </h1>

            <p className="mt-2 text-[15px] leading-6 text-muted sm:mt-3">
              Un espacio para entender más.
              <br />
              Y seguir aprendiendo a tu manera.
            </p>

            <LoginForm />
          </section>

          <aside
            className="hidden min-w-0 flex-col justify-center py-8 pr-2 lg:flex"
            aria-labelledby="study-title"
          >
            <h2
              id="study-title"
              className="font-display text-2xl leading-snug font-medium tracking-tight"
            >
              Tus documentos.
              <br />
              Las respuestas que buscas.
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted">
              Conecta las ideas con su origen.
            </p>

            <figure className="study-example mt-7 overflow-hidden rounded-2xl bg-surface shadow-sm">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <span className="rounded-md bg-accent-soft px-2 py-1.5 text-xs font-semibold text-accent-foreground">
                  PDF
                </span>

                <span className="text-sm font-medium">
                  Biología celular
                </span>
              </div>

              <div className="p-5">
                <p className="text-sm leading-6 font-medium">
                  ¿Qué función tiene la mitocondria?
                </p>

                <p className="mt-3 text-sm leading-7 text-muted">
                  Transforma la energía de los nutrientes en{" "}
                  <strong className="font-medium text-foreground">
                    ATP
                  </strong>
                  , que la célula utiliza para realizar sus funciones.
                </p>

                <span className="mt-4 inline-block rounded-md bg-accent-soft px-2.5 py-1.5 text-xs font-medium text-accent-foreground">
                  Fuente · Página 4
                </span>
              </div>

              <figcaption className="border-t border-border px-5 py-3 text-xs text-muted">
                Ejemplo de consulta con StudyAI
              </figcaption>
            </figure>
          </aside>
        </div>
      </main>

      <footer className="flex min-h-12 items-center justify-center text-xs text-muted sm:min-h-16">
        StudyAI · Tu espacio de aprendizaje
      </footer>
    </>
  );
}