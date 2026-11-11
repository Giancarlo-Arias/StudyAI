"use client";

import { useState, type FormEvent } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { redirectExpiredSession } from "@/lib/session-client";
import { DashboardIcon } from "./dashboard-icon";

async function getResponseError(response: Response, fallback: string): Promise<string> {
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
        throw new Error(await getResponseError(response, "No se pudo cambiar la contraseña."));
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Tu contraseña se actualizó correctamente.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cambiar la contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="workspace-panel p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-foreground">
          <DashboardIcon name="lock" />
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Seguridad de la cuenta</h2>

          <p className="mt-2 text-sm leading-6 text-muted">
            Actualiza tu contraseña para mantener protegida tu cuenta.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-5">
        <div className="space-y-2">
          <label htmlFor="current-password" className="block text-sm font-medium">
            Contraseña actual
          </label>

          <PasswordInput
            id="current-password"
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
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="new-password" className="block text-sm font-medium">
              Nueva contraseña
            </label>

            <PasswordInput
              id="new-password"
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
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="block text-sm font-medium">
              Confirmar nueva contraseña
            </label>

            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              disabled={isSubmitting}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
                setSuccess("");
              }}
            />
          </div>
        </div>

        <p className="text-xs leading-5 text-muted">
          La nueva contraseña debe tener entre 12 y 128 caracteres y ser diferente de la actual.
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

        <div className="border-t border-border pt-6">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="workspace-action workspace-action-primary"
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
