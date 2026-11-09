"use client";

import { useState, type FormEvent } from "react";
import { redirectExpiredSession } from "@/lib/session-client";

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

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isValid =
    currentPassword.length >= 1 &&
    currentPassword.length <= 128 &&
    newPassword.length >= 12 &&
    newPassword.length <= 128 &&
    confirmPassword.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValid || isSubmitting) return;

    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("La nueva contraseña debe ser diferente de la actual.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.status === 401) {
        await redirectExpiredSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          await getResponseError(
            response,
            "No se pudo cambiar la contraseña.",
          ),
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Tu contraseña se actualizó correctamente.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo cambiar la contraseña.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
      <div>
        <h2 className="font-display text-xl font-semibold">
          Seguridad de la cuenta
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Actualiza tu contraseña para mantener protegida tu cuenta.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 max-w-2xl space-y-6"
      >
        <div className="space-y-2">
          <label
            htmlFor="current-password"
            className="block text-sm font-medium"
          >
            Contraseña actual
          </label>

          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={currentPassword}
            disabled={isSubmitting}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setError("");
              setSuccess("");
            }}
            className="min-h-12 w-full rounded-xl border border-input-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="new-password"
              className="block text-sm font-medium"
            >
              Nueva contraseña
            </label>

            <input
              id="new-password"
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
                setSuccess("");
              }}
              className="min-h-12 w-full rounded-xl border border-input-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium"
            >
              Confirmar nueva contraseña
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              disabled={isSubmitting}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
                setSuccess("");
              }}
              className="min-h-12 w-full rounded-xl border border-input-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
            />
          </div>
        </div>

        <p className="text-xs text-muted">
          La nueva contraseña debe tener entre 12 y 128 caracteres
          y ser diferente de la actual.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-500"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="rounded-xl border border-primary/20 bg-accent-soft p-4 text-sm text-accent-foreground"
          >
            {success}
          </p>
        )}

        <div className="border-t border-input-border pt-6">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            {isSubmitting && (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
              />
            )}

            {isSubmitting ? "Actualizando..." : "Cambiar contraseña"}
          </button>
        </div>
      </form>
    </section>
  );
}