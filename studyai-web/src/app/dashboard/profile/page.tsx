"use client";

import { ProfileSkeleton } from "./skeleton";

import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { ViewTransition } from "react";
import { redirectExpiredSession } from "@/lib/session-client";
import type { CurrentUser } from "@/types/auth";

type ProfileState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; message: string }
  | { status: "ready"; user: CurrentUser };

function isCurrentUser(value: unknown): value is CurrentUser {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "number" &&
    typeof user.full_name === "string" &&
    typeof user.email === "string"
  );
}

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

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({
    status: "loading",
  });

  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useLayoutEffect(() => {
    return () => {
      setState({ status: "loading" });
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setState({ status: "redirecting" });
          await redirectExpiredSession();
          return;
        }

        if (!response.ok) {
          throw new Error(
            await getResponseError(
              response,
              "No se pudo cargar tu perfil.",
            ),
          );
        }

        const user: unknown = await response.json();

        if (!isCurrentUser(user)) {
          throw new Error(
            "El servidor devolvió datos de usuario inesperados.",
          );
        }

        if (controller.signal.aborted) return;

        setFullName(user.full_name);
        setState({ status: "ready", user });
      } catch (caught) {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          message:
            caught instanceof Error
              ? caught.message
              : "No se pudo cargar tu perfil.",
        });
      }
    }

    void loadProfile();

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (state.status !== "ready" || isSaving) return;

    const normalizedName = fullName.trim().replace(/\s+/g, " ");

    setSaveError("");
    setSuccess("");

    if (normalizedName.length < 2 || normalizedName.length > 150) {
      setSaveError("El nombre debe tener entre 2 y 150 caracteres.");
      return;
    }

    if (normalizedName === state.user.full_name) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: normalizedName,
        }),
      });

      if (response.status === 401) {
        setState({ status: "redirecting" });
        await redirectExpiredSession();
        return;
      }

      if (!response.ok) {
        throw new Error(
          await getResponseError(
            response,
            "No se pudo actualizar tu perfil.",
          ),
        );
      }

      const updatedUser: unknown = await response.json();

      if (!isCurrentUser(updatedUser)) {
        throw new Error(
          "El servidor devolvió datos de usuario inesperados.",
        );
      }

      setState({
        status: "ready",
        user: updatedUser,
      });

      setFullName(updatedUser.full_name);
      setSuccess("Tu nombre se actualizó correctamente.");
    } catch (caught) {
      setSaveError(
        caught instanceof Error
          ? caught.message
          : "No se pudo actualizar tu perfil.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const normalizedName = fullName.trim().replace(/\s+/g, " ");

  const hasChanges =
    state.status === "ready" &&
    normalizedName !== state.user.full_name;

  const validName =
    normalizedName.length >= 2 &&
    normalizedName.length <= 150;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <ViewTransition default="none" update="auto">
        {state.status === "loading" ? (
          <ProfileSkeleton />
        ) : state.status === "redirecting" ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-2xl border border-input-border bg-surface p-6"
          >
            <span
              aria-hidden="true"
              className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
            />

            <p className="text-sm text-muted">
              Tu sesión ha terminado. Redirigiendo al inicio de sesión...
            </p>
          </div>
        ) : state.status === "error" ? (
          <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
            <h1 className="font-display text-xl font-semibold">
              No se pudo cargar tu perfil
            </h1>

            <p role="alert" className="mt-3 text-sm text-muted">
              {state.message}
            </p>

            <button
              type="button"
              onClick={() => {
                setState({ status: "loading" });
                setReloadKey((value) => value + 1);
              }}
              className="mt-6 min-h-11 cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110"
            >
              Reintentar
            </button>
          </section>
        ) : (
          <div className="space-y-8">
            <header>
              <p className="text-sm font-medium text-primary">
                Configuración de cuenta
              </p>

              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Mi perfil
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Consulta tu información personal y mantén actualizado
                tu nombre en StudyAI.
              </p>
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-2xl border border-input-border bg-surface p-6 sm:p-8">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Información personal
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Modifica los datos de tu cuenta.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="profile-full-name"
                      className="block text-sm font-medium"
                    >
                      Nombre completo
                    </label>

                    <input
                      id="profile-full-name"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={150}
                      value={fullName}
                      disabled={isSaving}
                      onChange={(event) => {
                        setFullName(event.target.value);
                        setSaveError("");
                        setSuccess("");
                      }}
                      className="min-h-12 w-full rounded-xl border border-input-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60"
                    />

                    <p className="text-xs text-muted">
                      Entre 2 y 150 caracteres.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="profile-email"
                      className="block text-sm font-medium"
                    >
                      Correo electrónico
                    </label>

                    <input
                      id="profile-email"
                      type="email"
                      value={state.user.email}
                      readOnly
                      className="min-h-12 w-full cursor-not-allowed rounded-xl border border-input-border bg-surface-soft px-4 py-3 text-sm text-muted outline-none"
                    />

                    <p className="text-xs text-muted">
                      El correo electrónico no se puede modificar
                      desde esta sección.
                    </p>
                  </div>

                  {saveError && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-500"
                    >
                      {saveError}
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

                  <div className="flex flex-wrap gap-3 border-t border-input-border pt-6">
                    <button
                      type="submit"
                      disabled={!hasChanges || !validName || isSaving}
                      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-3 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                    >
                      {isSaving && (
                        <span
                          aria-hidden="true"
                          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
                        />
                      )}

                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </button>

                    {hasChanges && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                          setFullName(state.user.full_name);
                          setSaveError("");
                          setSuccess("");
                        }}
                        className="min-h-11 cursor-pointer rounded-xl border border-input-border px-5 py-3 text-sm font-medium transition-colors hover:bg-surface-soft disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <aside className="rounded-2xl border border-input-border bg-surface p-6">
                <div className="flex size-14 items-center justify-center rounded-full bg-accent-soft font-display text-2xl font-semibold text-accent-foreground">
                  {state.user.full_name.trim().charAt(0).toUpperCase()}
                </div>

                <h2 className="mt-5 break-words font-display text-lg font-semibold">
                  {state.user.full_name}
                </h2>

                <p className="mt-2 break-all text-sm text-muted">
                  {state.user.email}
                </p>
                
              </aside>
            </div>
          </div>
        )}
      </ViewTransition>
    </main>
  );
}