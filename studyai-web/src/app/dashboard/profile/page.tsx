"use client";

import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { DashboardReveal } from "@/components/dashboard/dashboard-reveal";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileSkeleton } from "./skeleton";
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
}[] = [
  {
    id: "overview",
    label: "General",
  },
  {
    id: "contact",
    label: "Datos personales",
  },
  {
    id: "security",
    label: "Seguridad",
  },
];

function isCurrentUser(value: unknown): value is CurrentUser {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "number" &&
    typeof user.full_name === "string" &&
    typeof user.email === "string"
  );
}

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

export default function ProfilePage() {
  const [state, setState] = useState<ProfileState>({
    status: "loading",
  });

  const [section, setSection] = useState<ProfileSection>("overview");
  const panelRef = useRef<HTMLDivElement>(null);
  const previousSectionRef = useRef<ProfileSection>("overview");
  const animateSectionRef = useRef(false);
  const previousHeightRef = useRef(0);
  const sectionDirectionRef = useRef(1);
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
          throw new Error(await getResponseError(response, "No se pudo cargar tu perfil."));
        }

        const user: unknown = await response.json();

        if (!isCurrentUser(user)) {
          throw new Error("El servidor devolvió datos de usuario inesperados.");
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
            message: caught instanceof Error ? caught.message : "No se pudo cargar tu perfil.",
          });
        });
      }
    }

    void loadProfile();

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  useLayoutEffect(() => {
    if (previousSectionRef.current === section) return;
    previousSectionRef.current = section;
    const panel = panelRef.current;
    if (
      !panel ||
      !animateSectionRef.current ||
      document.visibilityState === "hidden" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const content = panel.firstElementChild;
    if (!(content instanceof HTMLElement)) return;
    const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim();
    const height = content.getBoundingClientRect().height + 2;
    const animations = [
      panel.animate(
        [{ height: (previousHeightRef.current || height) + "px" }, { height: height + "px" }],
        { duration: 280, easing },
      ),
      content.animate(
        [
          { opacity: 0.72, transform: `translateX(${sectionDirectionRef.current * 10}px)` },
          { opacity: 1, transform: "translateX(0)" },
        ],
        { duration: 280, easing },
      ),
    ];
    return () => animations.forEach((animation) => animation.cancel());
  }, [section]);

  function navigateTo(nextSection: ProfileSection, animate = true) {
    if (nextSection === section) return;
    previousHeightRef.current = panelRef.current?.getBoundingClientRect().height ?? 0;
    sectionDirectionRef.current =
      navigationItems.findIndex((item) => item.id === nextSection) >
      navigationItems.findIndex((item) => item.id === section)
        ? 1
        : -1;
    animateSectionRef.current = animate;
    setSection(nextSection);
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
        throw new Error(await getResponseError(response, "No se pudo actualizar tu perfil."));
      }

      const updatedUser: unknown = await response.json();

      if (!isCurrentUser(updatedUser)) {
        throw new Error("El servidor devolvió datos de usuario inesperados.");
      }

      setState({
        status: "ready",
        user: updatedUser,
      });

      setFullName(updatedUser.full_name);
      setSuccess("Tu nombre se actualizó correctamente.");
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "No se pudo actualizar tu perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  const normalizedName = fullName.trim().replace(/\s+/g, " ");

  const hasChanges = state.status === "ready" && normalizedName !== state.user.full_name;

  const validName = normalizedName.length >= 2 && normalizedName.length <= 150;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
      {state.status === "loading" ? (
        <ProfileSkeleton />
      ) : state.status === "redirecting" ? (
        <div role="status" className="workspace-panel flex items-center gap-3 p-6">
          <span
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none"
          />
          <p className="text-sm text-muted">
            Tu sesión ha terminado. Redirigiendo al inicio de sesión...
          </p>
        </div>
      ) : state.status === "error" ? (
        <section className="workspace-panel p-6 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">No se pudo cargar tu perfil</h1>
          <p role="alert" className="mt-3 text-sm text-muted">
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              setState({ status: "loading" });
              setReloadKey((value) => value + 1);
            }}
            className="workspace-action workspace-action-primary mt-6"
          >
            Reintentar
          </button>
        </section>
      ) : (
        <DashboardReveal className="workspace-profile-content" containerEntrance>
          <header className="mb-5">
            <h1
              data-reveal="text"
              className="font-display text-2xl font-semibold leading-tight tracking-[-.035em] sm:text-[1.75rem]"
            >
              Mi perfil
            </h1>
            <p data-reveal="text" className="mt-2 text-sm leading-6 text-muted">
              Tu información y la seguridad de tu cuenta.
            </p>
          </header>

          <div data-reveal="" className="workspace-panel workspace-glass workspace-profile-summary">
            <div className="workspace-avatar size-12 rounded-2xl text-xl">
              {state.user.full_name.trim().charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-sm font-semibold">{state.user.full_name}</h2>
              <p className="mt-1 break-all text-xs text-muted">{state.user.email}</p>
            </div>
            <span className="hidden items-center gap-2 text-xs text-muted sm:flex">
              <DashboardIcon name="profile" className="size-4" />
              Mi cuenta
            </span>
          </div>

          <nav
            aria-label="Secciones de mi perfil"
            data-reveal="fade"
            className="workspace-profile-nav mt-5"
            data-section={section}
          >
            <span className="workspace-profile-indicator" aria-hidden="true" />
            {navigationItems.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={section === item.id}
                aria-label={item.label}
                aria-controls="profile-section-content"
                onClick={(event) => navigateTo(item.id, event.detail !== 0)}
              >
                <DashboardIcon
                  name={
                    item.id === "overview" ? "settings" : item.id === "contact" ? "profile" : "lock"
                  }
                  className="hidden size-4 shrink-0 sm:block"
                />
                <span className={item.id === "contact" ? "hidden sm:inline" : undefined}>
                  {item.label}
                </span>
                {item.id === "contact" && <span className="sm:hidden">Datos</span>}
              </button>
            ))}
          </nav>

          <div
            ref={panelRef}
            id="profile-section-content"
            data-reveal=""
            className="workspace-panel workspace-profile-pane min-w-0 mt-5"
          >
            {section === "overview" ? (
              <section
                className="workspace-panel overflow-hidden"
                aria-labelledby="account-summary-title"
              >
                <div className="border-b border-border px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2
                        id="account-summary-title"
                        className="text-xl font-semibold tracking-tight"
                      >
                        Tu cuenta, en un vistazo.
                      </h2>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
                        Consulta tus datos y administra cómo accedes a StudyAI.
                      </p>
                    </div>
                    <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-foreground sm:flex">
                      <DashboardIcon name="profile" />
                    </span>
                  </div>
                </div>
                <dl className="divide-y divide-border px-5 sm:px-6">
                  <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <dt className="text-sm text-muted">Nombre completo</dt>
                    <dd className="break-words text-sm font-medium">{state.user.full_name}</dd>
                  </div>
                  <div className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-[160px_minmax(0,1fr)]">
                    <dt className="text-sm text-muted">Correo electrónico</dt>
                    <dd className="break-all text-sm font-medium">{state.user.email}</dd>
                  </div>
                </dl>
                <div className="px-5 pb-5 sm:px-6">
                  <button
                    type="button"
                    className="workspace-action"
                    onClick={(event) => navigateTo("contact", event.detail !== 0)}
                  >
                    <DashboardIcon name="profile" className="size-4" />
                    Editar datos personales
                  </button>
                </div>
                <div className="flex flex-col items-start justify-between gap-4 border-t border-border bg-surface-soft/50 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-muted">
                      <DashboardIcon name="lock" className="size-[18px]" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold">Seguridad de acceso</h3>
                      <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
                        Actualiza tu contraseña cuando lo necesites.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="workspace-section-link"
                    onClick={(event) => navigateTo("security", event.detail !== 0)}
                  >
                    Cambiar contraseña
                    <DashboardIcon name="arrow" className="size-4" />
                  </button>
                </div>
              </section>
            ) : section === "contact" ? (
              <section
                className="workspace-panel overflow-hidden"
                aria-labelledby="personal-info-title"
              >
                <div className="border-b border-border p-5 sm:px-6">
                  <h2 id="personal-info-title" className="text-xl font-semibold tracking-tight">
                    Datos personales
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Así te identificas en tu espacio de aprendizaje.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
                  <div className="workspace-profile-form-grid">
                    <div className="max-w-xl space-y-2">
                      <label htmlFor="profile-full-name" className="block text-sm font-medium">
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
                        aria-describedby="profile-name-help"
                        onChange={(event) => {
                          setFullName(event.target.value);
                          setSaveError("");
                          setSuccess("");
                        }}
                        className="workspace-field"
                      />
                      <p id="profile-name-help" className="text-xs leading-5 text-muted">
                        Entre 2 y 150 caracteres.
                      </p>
                    </div>
                    <div className="max-w-xl space-y-2">
                      <label htmlFor="profile-email" className="block text-sm font-medium">
                        Correo electrónico
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        value={state.user.email}
                        readOnly
                        aria-describedby="profile-email-help"
                        className="workspace-field"
                      />
                      <p id="profile-email-help" className="text-xs leading-5 text-muted">
                        El correo está vinculado a tu cuenta y no se puede modificar desde aquí.
                      </p>
                    </div>
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
                  <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                    <button
                      type="submit"
                      disabled={!hasChanges || !validName || isSaving}
                      className="workspace-action workspace-action-primary"
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
                        className="workspace-action"
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
          <div data-reveal="fade" className="mt-5 flex justify-end">
            <LogoutButton />
          </div>
        </DashboardReveal>
      )}
    </main>
  );
}
