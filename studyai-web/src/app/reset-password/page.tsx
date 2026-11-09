"use client";

import Link from "next/link";
import {
  Suspense,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

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

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState("");

  const validToken = TOKEN_PATTERN.test(token);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isCompleted) return;

    setError("");

    if (!validToken) {
      setError("El enlace de recuperación no es válido.");
      return;
    }

    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("La contraseña debe tener entre 12 y 128 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getResponseError(
            response,
            "No se pudo restablecer tu contraseña.",
          ),
        );
      }

      setNewPassword("");
      setConfirmPassword("");
      setIsCompleted(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo restablecer tu contraseña.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!validToken) {
    return (
      <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
        <h1 className="font-display text-2xl font-semibold">
          Enlace no válido
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          El enlace de recuperación está incompleto o no tiene
          un formato válido. Solicita uno nuevo para continuar.
        </p>

        <Link
          href="/forgot-password"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          Solicitar otro enlace
        </Link>
      </section>
    );
  }

  if (isCompleted) {
    return (
      <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-accent-soft text-2xl text-primary">
          ✓
        </div>

        <h1 className="font-display text-2xl font-semibold">
          Contraseña actualizada
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted">
          Tu contraseña se restableció correctamente.
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>

        <Link
          href="/login"
          className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110"
        >
          Iniciar sesión
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Crear nueva contraseña
      </h1>

      <p className="mt-3 text-sm leading-6 text-muted">
        Introduce una contraseña nueva para recuperar el acceso
        a tu cuenta de StudyAI.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="reset-new-password"
            className="block text-sm font-medium"
          >
            Nueva contraseña
          </label>

          <input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={newPassword}
            disabled={isSubmitting}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setError("");
            }}
            placeholder="Mínimo 12 caracteres"
            className="min-h-12 w-full rounded-xl border border-input-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
          />

          <p className="text-xs text-muted">
            Utiliza entre 12 y 128 caracteres.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="reset-confirm-password"
            className="block text-sm font-medium"
          >
            Confirmar nueva contraseña
          </label>

          <input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
            value={confirmPassword}
            disabled={isSubmitting}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError("");
            }}
            placeholder="Repite tu contraseña"
            className="min-h-12 w-full rounded-xl border border-input-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="space-y-3 rounded-xl border border-red-500/25 bg-red-500/5 p-4"
          >
            <p className="text-sm text-red-500">{error}</p>

            {error.toLowerCase().includes("enlace") && (
              <Link
                href="/forgot-password"
                className="inline-block text-sm font-semibold text-primary underline"
              >
                Solicitar un enlace nuevo
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
        >
          {isSubmitting && (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
          )}

          {isSubmitting
            ? "Actualizando contraseña..."
            : "Restablecer contraseña"}
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
  );
}

export default function ResetPasswordPage() {
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

        <Suspense
          fallback={
            <section
              role="status"
              className="rounded-2xl border border-input-border bg-surface p-8 text-sm text-muted"
            >
              Preparando recuperación de contraseña...
            </section>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}