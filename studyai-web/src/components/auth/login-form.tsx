"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { login, getCurrentUser } from "@/lib/auth";
import { validateEmail, validatePassword } from "@/lib/validations/auth";

const themes = [
  { value: "light", label: "Claro", path: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" },
  { value: "dark", label: "Oscuro", path: "M20.7 13A9 9 0 0 1 11 3.3 9 9 0 1 0 20.7 13Z" },
  { value: "system", label: "Sistema", path: "M3 4h18v13H3V4Zm5 17h8m-4-4v4" },
] as const;

function Glyph({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

function themeSnapshot() {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
}

function subscribeTheme(listener: () => void) {
  window.addEventListener("studyai-theme-change", listener);

  const syncStoredTheme = () => {
    try {
      const value = localStorage.getItem("studyai-theme");

      if (value === "light" || value === "dark") {
        document.documentElement.dataset.theme = value;
      } else {
        document.documentElement.removeAttribute("data-theme");
      }

      listener();
    } catch {
      listener();
    }
  };

  window.addEventListener("storage", syncStoredTheme);

  return () => {
    window.removeEventListener("studyai-theme-change", listener);
    window.removeEventListener("storage", syncStoredTheme);
  };
}

export function ThemeControl() {
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, () => "system");
  const transitionRef = useRef<ViewTransition | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedThemeRef = useRef("system");

  useEffect(() => {
    return () => {
      transitionRef.current?.skipTransition();
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
      document.documentElement.classList.remove("theme-fallback");
    };
  }, []);

  function changeTheme(value: string, anchor: HTMLElement | null, keyboard: boolean) {
    requestedThemeRef.current = value;
    transitionRef.current?.skipTransition();

    const root = document.documentElement;

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    root.classList.remove("theme-fallback");

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = (selection: string) => selection === "dark" || (selection === "system" && systemDark);

    const update = () => {
      const selected = requestedThemeRef.current;

      if (selected === "system") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", selected);

      const notify = () => window.dispatchEvent(new Event("studyai-theme-change"));

      try {
        if (selected === "system") localStorage.removeItem("studyai-theme");
        else localStorage.setItem("studyai-theme", selected);
      } catch {
        notify();
        return;
      }

      notify();
    };

    if (
      keyboard ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      isDark(root.dataset.theme ?? "system") === isDark(value)
    ) {
      update();
      return;
    }

    if (!document.startViewTransition) {
      root.classList.add("theme-fallback");
      update();

      fallbackTimerRef.current = setTimeout(
        () => root.classList.remove("theme-fallback"),
        500,
      );

      return;
    }

    const rect = anchor?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : 48;

    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    ) + 8;

    root.style.setProperty("--theme-origin-x", `${x}px`);
    root.style.setProperty("--theme-origin-y", `${y}px`);
    root.style.setProperty("--theme-reveal-radius", `${radius}px`);

    const next = document.startViewTransition(update);
    transitionRef.current = next;

    void next.ready.catch(() => {});

    void next.finished.then(() => {
      if (transitionRef.current === next) transitionRef.current = null;
    });
  }

  return (
    <fieldset className="theme-switch relative isolate flex rounded-full p-1">
      <legend className="sr-only">Tema de la interfaz</legend>
      <span aria-hidden="true" className="theme-indicator pointer-events-none absolute top-1 left-1 size-11 rounded-full" />

      {themes.map((item) => (
        <label
          key={item.value}
          title={item.label}
          className="relative flex size-11 cursor-pointer items-center justify-center rounded-full text-muted has-checked:text-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
        >
          <input
            type="radio"
            name="appearance"
            className="peer sr-only"
            value={item.value}
            checked={theme === item.value}
            onChange={(event) =>
              changeTheme(
                item.value,
                event.currentTarget.parentElement,
                event.currentTarget.matches(":focus-visible"),
              )
            }
          />
          <span className="sr-only">{item.label}</span>
          <Glyph path={item.path} />
        </label>
      ))}
    </fieldset>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-input-border bg-surface px-3.5 text-base text-foreground placeholder:text-muted hover:border-muted focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-focus";

const eyePath = "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0";
const eyeOffPath = "m3 3 18 18M10.6 5.1 12 5c7 0 10 7 10 7a19 19 0 0 0-3.2 4.2M6.2 6.2A20 20 0 0 0 2 12s3 7 10 7a12 12 0 0 0 5.8-1.8M10 10a3 3 0 0 0 4 4";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isAuthenticated) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setError("");

    if (nextEmailError || nextPasswordError) {
      if (nextEmailError) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await login(email, password);

      if (!response.ok) {
        if (response.status === 400 || response.status === 401) {
          setError("No se pudo iniciar sesión. Verifica tus credenciales.");
        } else {
          setError("Ocurrió un error al iniciar sesión. Inténtalo nuevamente.");
        }
        return;
      }

      const data: unknown = await response.json();

      if (
        typeof data !== "object" ||
        data === null ||
        !("success" in data) ||
        data.success !== true
      ) {
        setError("Respuesta inesperada del servidor.");
        return;
      }

      const sessionResponse = await getCurrentUser();

      if (!sessionResponse.ok) {
        setError("No se pudo verificar la sesión. Inténtalo nuevamente.");
        return;
      }

      setIsAuthenticated(true);
      router.replace("/dashboard");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-7" aria-label="Iniciar sesión" method="post" noValidate onSubmit={handleSubmit}>
      <label className="block text-sm font-medium" htmlFor="login-email">
        Correo electrónico
      </label>
      <input
        ref={emailRef}
        className={`${inputClass} mt-2 aria-invalid:border-red-500 aria-invalid:focus:border-red-500 aria-invalid:focus:outline-red-500`}
        id="login-email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="tu@ejemplo.com"
        spellCheck={false}
        autoCapitalize="none"
        aria-invalid={Boolean(emailError)}
        aria-describedby={emailError ? "login-email-error" : undefined}
        onBlur={(event) => setEmailError(validateEmail(event.target.value))}
        onChange={() => setEmailError("")}
        required
      />
      {emailError && (
        <p id="login-email-error" role="alert" className="mt-2 text-sm text-red-500">
          {emailError}
        </p>
      )}

      <label className="mt-5 block text-sm font-medium" htmlFor="login-password">
        Contraseña
      </label>
      <div className="relative mt-2">
        <input
          ref={passwordRef}
          className={`${inputClass} pr-12 aria-invalid:border-red-500 aria-invalid:focus:border-red-500 aria-invalid:focus:outline-red-500`}
          id="login-password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Tu contraseña"
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? "login-password-error" : undefined}
          onBlur={(event) => setPasswordError(validatePassword(event.target.value))}
          onChange={() => setPasswordError("")}
          required
        />
        <button
          className="password-toggle absolute top-0.5 right-0.5 flex size-11 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface-soft hover:text-foreground"
          type="button"
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-controls="login-password"
          aria-pressed={showPassword}
          onClick={() => setShowPassword(!showPassword)}
        >
          <Glyph path={showPassword ? eyePath : eyeOffPath} />
        </button>
      </div>
      {passwordError && (
        <p id="login-password-error" role="alert" className="mt-2 text-sm text-red-500">
          {passwordError}
        </p>
      )}

      <div className="mt-4 text-right text-sm">
        <span role="link" aria-disabled="true" aria-describedby="unavailable" className="cursor-not-allowed text-muted">
          ¿Olvidaste tu contraseña?
        </span>
      </div>

      <button
        className="login-submit mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-[filter,box-shadow] duration-200 enabled:cursor-pointer enabled:hover:brightness-110 enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80 motion-reduce:transition-none"
        type="submit"
        disabled={isSubmitting || isAuthenticated}
      >
        {isSubmitting
          ? "Iniciando sesión..."
          : isAuthenticated
            ? "Sesión iniciada"
            : "Iniciar sesión"}

        {!isSubmitting && !isAuthenticated && (
          <Glyph path="M5 12h14m-6-6 6 6-6 6" />
        )}
      </button>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-red-500">
          {error}
        </p>
      )}

      {isAuthenticated && (
        <p role="status" className="mt-4 text-center text-sm text-accent-foreground">
          Autenticación exitosa. Sesión verificada.
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <span role="link" aria-disabled="true" aria-describedby="unavailable" className="cursor-not-allowed font-medium text-foreground">
          Crear cuenta
        </span>
      </p>

      <p id="unavailable" className="mt-5 text-center text-xs leading-5 text-muted">
        Registro y recuperación disponibles próximamente.
      </p>
    </form>
  );
}