"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

async function getResponseError(
  response: Response,
  fallback: string,
): Promise<string> {
  const data: unknown = await response.json().catch(() => null);

  if (data && typeof data === "object") {
    if ("error" in data && typeof data.error === "string") {
      return data.error;
    }

    if ("detail" in data && typeof data.detail === "string") {
      return data.detail;
    }
  }

  return fallback;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailRequested, setEmailRequested] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timeout = window.setTimeout(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [secondsLeft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || secondsLeft > 0) return;

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Introduce tu correo electrónico.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getResponseError(
            response,
            "No se pudo solicitar la recuperación.",
          ),
        );
      }

      setEmail(normalizedEmail);
      setEmailRequested(true);
      setSecondsLeft(60);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo solicitar la recuperación.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight"
          >
            Study<span className="text-primary">AI</span>
          </Link>
        </div>

        <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
          <div className="mb-7">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              ¿Olvidaste tu contraseña?
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted">
              Introduce el correo electrónico asociado a tu cuenta
              para recibir un enlace de recuperación.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="forgot-email"
                className="block text-sm font-medium"
              >
                Correo electrónico
              </label>

              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                disabled={isSubmitting}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                  setEmailRequested(false);
                  setSecondsLeft(0);
                }}
                placeholder="correo@ejemplo.com"
                className="min-h-12 w-full rounded-xl border border-input-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-500"
              >
                {error}
              </p>
            )}

            {emailRequested && (
              <div
                role="status"
                className="rounded-xl border border-primary/20 bg-accent-soft p-4"
              >
                <p className="text-sm font-semibold text-accent-foreground">
                  Solicitud recibida
                </p>

                <p className="mt-2 text-sm leading-6 text-muted">
                  Si el correo está registrado, recibirás instrucciones
                  para recuperar tu contraseña.
                </p>

                <p className="mt-3 text-xs leading-5 text-muted">
                  Revisa también la carpeta de spam o correo no deseado.
                  El enlace tendrá una validez de 30 minutos.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || secondsLeft > 0}
              className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {isSubmitting && (
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                />
              )}

              {isSubmitting
                ? "Procesando..."
                : emailRequested
                  ? secondsLeft > 0
                    ? `Reenviar correo en ${secondsLeft} s`
                    : "Reenviar correo"
                  : "Enviar enlace de recuperación"}
            </button>
          </form>

          <div className="mt-7 border-t border-input-border pt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-primary transition-opacity hover:opacity-75"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}