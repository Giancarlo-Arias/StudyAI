"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
} from "react";

import { login, getCurrentUser } from "@/lib/auth";
import { validateEmail, validatePassword } from "@/lib/validations/auth";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import eyeIcon from "@/assets/icons/eye.svg";
import eyeOffIcon from "@/assets/icons/eye-off.svg";

const themes = [
  {
    value: "light",
    label: "Claro",
    path: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5",
  },
  {
    value: "dark",
    label: "Oscuro",
    path: "M20.7 13A9 9 0 0 1 11 3.3 9 9 0 1 0 20.7 13Z",
  },
  {
    value: "system",
    label: "Sistema",
    path: "M3 4h18v13H3V4Zm5 17h8m-4-4v4",
  },
] as const;

function Glyph({ path }: { path: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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

      window.dispatchEvent(new Event("studyai-theme-change"));
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

      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }

      document.documentElement.classList.remove("theme-fallback");
      document.documentElement.classList.remove("theme-view-transition");
    };
  }, []);

  function changeTheme(value: string, anchor: HTMLElement | null, keyboard: boolean) {
    requestedThemeRef.current = value;
    transitionRef.current?.skipTransition();

    const root = document.documentElement;
    root.classList.add("theme-user-interaction");
    root.classList.remove("theme-view-transition");

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }

    root.classList.remove("theme-fallback");

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    const isDark = (selection: string) =>
      selection === "dark" || (selection === "system" && systemDark);

    const update = () => {
      const selected = requestedThemeRef.current;

      if (selected === "system") {
        root.removeAttribute("data-theme");
      } else {
        root.setAttribute("data-theme", selected);
      }

      const notify = () => window.dispatchEvent(new Event("studyai-theme-change"));

      try {
        if (selected === "system") {
          localStorage.removeItem("studyai-theme");
        } else {
          localStorage.setItem("studyai-theme", selected);
        }
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

      fallbackTimerRef.current = setTimeout(() => root.classList.remove("theme-fallback"), 500);

      return;
    }

    const rect = anchor?.getBoundingClientRect();

    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;

    const y = rect ? rect.top + rect.height / 2 : 48;

    const radius =
      Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 8;

    root.style.setProperty("--theme-origin-x", `${x}px`);
    root.style.setProperty("--theme-origin-y", `${y}px`);
    root.style.setProperty("--theme-reveal-radius", `${radius}px`);

    root.classList.add("theme-view-transition");
    const next = document.startViewTransition(update);
    transitionRef.current = next;

    void next.ready.catch(() => {});

    void next.finished.then(() => {
      if (transitionRef.current === next) {
        transitionRef.current = null;
        root.classList.remove("theme-view-transition");
      }
    });
  }

  return (
    <fieldset className="theme-switch relative isolate flex rounded-full p-1">
      <legend className="sr-only">Tema de la interfaz</legend>

      <span
        aria-hidden="true"
        className="theme-indicator pointer-events-none absolute top-1 left-1 size-11 rounded-full"
      />

      {themes.map((item) => (
        <label
          key={item.value}
          title={item.label}
          data-theme-option={item.value}
          className="relative flex size-11 cursor-pointer items-center justify-center rounded-full text-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus"
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

type LoginFormProps = {
  verified?: boolean;
};

export function LoginForm({ verified = false }: LoginFormProps) {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startTransition] = useTransition();

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [error, setError] = useState("");

  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function clearFields() {
      if (emailRef.current) {
        emailRef.current.value = "";
      }

      if (passwordRef.current) {
        passwordRef.current.value = "";
      }
    }

    clearFields();

    window.addEventListener("pageshow", clearFields);

    return () => {
      window.removeEventListener("pageshow", clearFields);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isNavigating) return;

    const form = event.currentTarget;

    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setError("");

    setUnverifiedEmail("");

    if (nextEmailError || nextPasswordError) {
      if (nextEmailError) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await login(email, password);

      if (!response.ok) {
        if (response.status === 403) {
          setError("Debes verificar tu correo electrónico para continuar.");

          setUnverifiedEmail(email);
        } else if (response.status === 400 || response.status === 401) {
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

      form.reset();

      if (emailRef.current) {
        emailRef.current.value = "";
      }

      if (passwordRef.current) {
        passwordRef.current.value = "";
      }

      setShowPassword(false);

      startTransition(() => {
        router.replace("/dashboard", {
          transitionTypes: ["login-dashboard"],
        });
      });
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="mt-7"
      aria-label="Iniciar sesión"
      method="post"
      noValidate
      onSubmit={handleSubmit}
    >
      {verified && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-accent-soft px-4 py-3 text-sm leading-6 text-accent-foreground"
        >
          <svg
            className="mt-0.5 size-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>

          <span>Correo verificado correctamente. Ya puedes iniciar sesión.</span>
        </div>
      )}

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
        onChange={() => {
          setEmailError("");
          setUnverifiedEmail("");
          setError("");
        }}
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
          <span
            aria-hidden="true"
            className="dashboard-icon size-[18px]"
            style={{ maskImage: `url(${showPassword ? eyeIcon.src : eyeOffIcon.src})` }}
          />
        </button>
      </div>

      {passwordError && (
        <p id="login-password-error" role="alert" className="mt-2 text-sm text-red-500">
          {passwordError}
        </p>
      )}

      <div className="mt-4 text-right text-sm">
        <Link
          href="/forgot-password"
          className="inline-flex min-h-11 items-center justify-center rounded-md font-medium text-primary transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <button
        className="login-submit mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-[filter,box-shadow] duration-200 enabled:cursor-pointer enabled:hover:brightness-110 enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80 motion-reduce:transition-none"
        type="submit"
        disabled={isSubmitting || isNavigating}
      >
        {isSubmitting || isNavigating ? "Iniciando sesión..." : "Iniciar sesión"}

        {!isSubmitting && !isNavigating && <DashboardIcon name="arrow" className="size-[18px]" />}
      </button>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-red-500">
          {error}
        </p>
      )}

      {unverifiedEmail && (
        <p className="mt-3 text-center text-sm">
          <Link
            href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
            className="inline-flex min-h-11 items-center justify-center font-medium text-primary transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
          >
            Verificar ahora
          </Link>
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-medium text-primary transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
        >
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
