"use client";

import {
  ViewTransition,
  startTransition,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { redirectExpiredSession } from "@/lib/session-client";
import type { CurrentUser } from "@/types/auth";

type ProfileSection = "overview" | "contact" | "security";

type ProfileState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; message: string }
  | { status: "ready"; user: CurrentUser };

const navigationItems: {
  id: ProfileSection;
  label: string;
  description: string;
}[] = [
  {
    id: "overview",
    label: "Inicio",
    description: "Resumen de cuenta",
  },
  {
    id: "contact",
    label: "Información de contacto",
    description: "Tus datos personales",
  },
  {
    id: "security",
    label: "Cambiar contraseña",
    description: "Seguridad de acceso",
  },
];

function SectionIcon({
  section,
  className = "size-5",
}: {
  section: ProfileSection;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {section === "overview" ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </>
      ) : section === "contact" ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2.5" />
          <circle cx="9" cy="10" r="2" />
          <path d="M5.5 16a3.5 3.5 0 0 1 7 0" />
          <path d="M15 9h3" />
          <path d="M15 13h3" />
          <path d="M15 17h2" />
        </>
      ) : (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          <circle cx="12" cy="15" r="1" />
          <path d="M12 16v2" />
        </>
      )}
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

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

function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando perfil"
      className="animate-pulse space-y-8 motion-reduce:animate-none"
    >
      <div className="space-y-4">
        <div className="h-4 w-36 rounded-full bg-surface-soft" />
        <div className="h-10 w-64 max-w-full rounded-xl bg-surface-soft" />
        <div className="h-4 w-80 max-w-full rounded-full bg-surface-soft" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-input-border bg-surface p-5">
          <div className="size-14 rounded-2xl bg-surface-soft" />

          <div className="mt-5 space-y-3">
            <div className="h-5 w-40 rounded-lg bg-surface-soft" />
            <div className="h-4 w-48 max-w-full rounded-full bg-surface-soft" />
          </div>

          <div className="mt-8 space-y-3 border-t border-input-border pt-6">
            {["overview", "contact", "security"].map((item) => (
              <div
                key={item}
                className="h-12 rounded-xl bg-surface-soft"
              />
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-input-border bg-surface">
          <div className="space-y-4 border-b border-input-border p-7 sm:p-9">
            <div className="h-4 w-32 rounded-full bg-surface-soft" />
            <div className="h-9 w-64 max-w-full rounded-xl bg-surface-soft" />
            <div className="h-4 w-80 max-w-full rounded-full bg-surface-soft" />
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
            {["personal", "password"].map((item) => (
              <div
                key={item}
                className="space-y-5 rounded-2xl border border-input-border p-6"
              >
                <div className="size-11 rounded-xl bg-surface-soft" />
                <div className="h-5 w-40 rounded-lg bg-surface-soft" />
                <div className="h-4 w-44 rounded-full bg-surface-soft" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({
    status: "loading",
  });

  const [section, setSection] = useState<ProfileSection>("overview");
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [success, setSuccess] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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

        startTransition(() => {
          setState({
            status: "ready",
            user,
          });
        });
      } catch (caught) {
        if (controller.signal.aborted) return;

        startTransition(() => {
          setState({
            status: "error",
            message:
              caught instanceof Error
                ? caught.message
                : "No se pudo cargar tu perfil.",
          });
        });
      }
    }

    void loadProfile();

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  function navigateTo(nextSection: ProfileSection) {
    if (nextSection === section) return;

    startTransition(() => {
      setSection(nextSection);
    });
  }

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
        <section className="rounded-3xl border border-input-border bg-surface p-7 sm:p-9">
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
              Un espacio para administrar tu información personal
              y mantener protegida tu cuenta.
            </p>
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[272px_minmax(0,1fr)] lg:gap-8">
            <aside className="overflow-hidden rounded-3xl border border-input-border bg-surface">
              <div className="p-5 sm:p-6">
                <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/15 bg-accent-soft font-display text-2xl font-semibold text-accent-foreground">
                  {state.user.full_name.trim().charAt(0).toUpperCase() || "U"}
                </div>

                <h2 className="mt-5 break-words font-display text-lg font-semibold tracking-tight">
                  {state.user.full_name}
                </h2>

                <p className="mt-1.5 break-all text-xs leading-5 text-muted">
                  {state.user.email}
                </p>
              </div>

              <div className="border-t border-input-border p-2 sm:p-3">
                <p className="hidden px-3 pb-3 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted lg:block">
                  Configuración
                </p>

                <nav
                  aria-label="Secciones de la cuenta"
                  className="flex gap-1 overflow-x-auto lg:flex-col"
                >
                  {navigationItems.map((item) => {
                    const active = section === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => navigateTo(item.id)}
                        className={`group flex min-h-12 shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-[background-color,color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:w-full ${
                          active
                            ? "bg-accent-soft text-accent-foreground"
                            : "text-muted hover:bg-surface-soft hover:text-foreground"
                        }`}
                      >
                        <span
                          className={
                            active
                              ? "text-primary"
                              : "text-muted group-hover:text-foreground"
                          }
                        >
                          <SectionIcon section={item.id} />
                        </span>

                        <span className="min-w-0 flex-1 whitespace-nowrap lg:whitespace-normal">
                          {item.label}
                        </span>

                        <span className="hidden opacity-60 lg:block">
                          <ChevronIcon />
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="hidden border-t border-input-border p-5 lg:block">
                <p className="text-xs leading-6 text-muted">
                  Gestiona tu cuenta de forma segura desde StudyAI.
                </p>
              </div>
            </aside>

            <div className="min-w-0">
              <ViewTransition default="none" update="auto">
                <div key={section}>
                  {section === "overview" ? (
                    <section className="overflow-hidden rounded-3xl border border-input-border bg-surface">
                      <div className="relative overflow-hidden border-b border-input-border bg-surface-soft p-6 sm:p-9">
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
                        />

                        <div className="relative">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                            Resumen de cuenta
                          </p>

                          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                            Tu espacio en StudyAI
                          </h2>

                          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
                            Consulta tus datos personales, actualiza
                            tu información y administra la seguridad
                            de tu cuenta desde un solo lugar.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-8">
                        <button
                          type="button"
                          onClick={() => navigateTo("contact")}
                          className="group flex min-h-48 cursor-pointer flex-col items-start rounded-2xl border border-input-border bg-background p-6 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/40 hover:bg-surface-soft hover:shadow-lg hover:shadow-primary/5"
                        >
                          <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-primary">
                            <SectionIcon section="contact" />
                          </span>

                          <h3 className="mt-6 font-display text-lg font-semibold">
                            Información personal
                          </h3>

                          <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                            Consulta tu correo electrónico y actualiza
                            tu nombre completo.
                          </p>

                          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                            Administrar
                            <ChevronIcon />
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => navigateTo("security")}
                          className="group flex min-h-48 cursor-pointer flex-col items-start rounded-2xl border border-input-border bg-background p-6 text-left transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/40 hover:bg-surface-soft hover:shadow-lg hover:shadow-primary/5"
                        >
                          <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-primary">
                            <SectionIcon section="security" />
                          </span>

                          <h3 className="mt-6 font-display text-lg font-semibold">
                            Seguridad de la cuenta
                          </h3>

                          <p className="mt-2 flex-1 text-sm leading-6 text-muted">
                            Cambia tu contraseña utilizando tus
                            credenciales actuales.
                          </p>

                          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                            Administrar
                            <ChevronIcon />
                          </span>
                        </button>
                      </div>
                    </section>
                  ) : section === "contact" ? (
                    <section className="overflow-hidden rounded-3xl border border-input-border bg-surface">
                      <div className="border-b border-input-border p-6 sm:p-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          Datos de la cuenta
                        </p>

                        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
                          Información de contacto
                        </h2>

                        <p className="mt-3 text-sm leading-6 text-muted">
                          Mantén actualizada tu información personal.
                        </p>
                      </div>

                      <form
                        onSubmit={handleSubmit}
                        className="max-w-2xl space-y-7 p-6 sm:p-8"
                      >
                        <div className="space-y-2">
                          <label
                            htmlFor="profile-full-name"
                            className="block text-sm font-semibold"
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
                            className="block text-sm font-semibold"
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

                          <p className="text-xs leading-5 text-muted">
                            Tu correo electrónico está vinculado a la cuenta
                            y no se puede modificar desde esta sección.
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
                  ) : (
                    <ChangePasswordForm />
                  )}
                </div>
              </ViewTransition>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}