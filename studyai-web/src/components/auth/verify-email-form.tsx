"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import {
  resendVerificationCode,
  verifyEmailCode,
} from "@/lib/auth";
import { validateEmail } from "@/lib/validations/auth";

type VerifyEmailFormProps = {
  initialEmail: string;
};

const inputClass =
  "h-12 w-full rounded-xl border border-input-border bg-surface px-3.5 text-base text-foreground placeholder:text-muted hover:border-muted focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-focus";

const COOLDOWN_SECONDS = 60;

function getCooldownKey(email: string): string {
  return `studyai:verification-cooldown:${email.trim().toLowerCase()}`;
}

// Nuevo: recuperar el tiempo restante desde sessionStorage.
function getRemainingCooldownSeconds(email: string): number {
  if (!email.trim()) return 0;

  const key = getCooldownKey(email);

  try {
    const storedValue = sessionStorage.getItem(key);

    if (!storedValue) return 0;

    const cooldownUntil = Number(storedValue);

    if (
      !Number.isFinite(cooldownUntil) ||
      cooldownUntil <= Date.now()
    ) {
      sessionStorage.removeItem(key);
      return 0;
    }

    return Math.max(
      0,
      Math.ceil((cooldownUntil - Date.now()) / 1000),
    );
  } catch {
    return 0;
  }
}

// Nuevo: registrar el bloqueo después de solicitar otro código.
function saveCooldown(email: string): void {
  const key = getCooldownKey(email);
  const cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000;

  try {
    sessionStorage.setItem(key, String(cooldownUntil));
  } catch {
    // El bloqueo del backend continúa siendo obligatorio.
  }
}

async function getResponseError(response: Response): Promise<string> {
  const data: unknown = await response.json().catch(() => null);

  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return "Ocurrió un error. Inténtalo nuevamente.";
}

export function VerifyEmailForm({
  initialEmail,
}: VerifyEmailFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");

  // null indica que todavía se está recuperando el contador.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Nuevo: actualizar el tiempo según la fecha guardada.
  // No reinicia los 60 segundos cuando se recarga la página.
  useEffect(() => {
    function updateCountdown() {
      setSecondsLeft(getRemainingCooldownSeconds(email));
    }

    const initialTimer = window.setTimeout(updateCountdown, 0);

    const interval = window.setInterval(
      updateCountdown,
      1000,
    );

    // Corregir el contador al regresar a la pestaña.
    document.addEventListener(
      "visibilitychange",
      updateCountdown,
    );

    window.addEventListener(
      "pageshow",
      updateCountdown,
    );

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        updateCountdown,
      );

      window.removeEventListener(
        "pageshow",
        updateCountdown,
      );
    };
  }, [email]);

  // Enviar los seis dígitos para verificar el correo.
  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isVerifying || isResending) return;

    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const emailError = validateEmail(normalizedEmail);

    if (emailError) {
      setError(emailError);
      return;
    }

    if (!/^[0-9]{6}$/.test(code)) {
      setError("Ingresa el código de 6 dígitos.");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await verifyEmailCode(
        normalizedEmail,
        code,
      );

      if (!response.ok) {
        setError(await getResponseError(response));
        return;
      }

      const result: unknown = await response.json();

      if (
        typeof result !== "object" ||
        result === null ||
        !("success" in result) ||
        result.success !== true
      ) {
        setError("Respuesta inesperada del servidor.");
        return;
      }

      setMessage("Correo verificado correctamente.");
      setCode("");

      // El usuario ya puede iniciar sesión.
      router.replace("/login?verified=1");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsVerifying(false);
    }
  }

  // Solicitar otro código respetando el contador de 60 segundos.
  async function handleResend() {
    if (
      isResending ||
      isVerifying ||
      secondsLeft === null ||
      secondsLeft > 0
    ) {
      return;
    }

    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    const emailError = validateEmail(normalizedEmail);

    if (emailError) {
      setError(emailError);
      return;
    }

    setIsResending(true);

    try {
      const response = await resendVerificationCode(
        normalizedEmail,
      );

      if (!response.ok) {
        setError(await getResponseError(response));
        return;
      }

      // La respuesta es genérica por seguridad.
      // No garantiza que el proveedor haya entregado el correo.
      setMessage(
        "Si tu cuenta está pendiente, recibirás un nuevo código.",
      );

      setCode("");

      // Nuevo: guardar la fecha de finalización del bloqueo.
      saveCooldown(normalizedEmail);

      // Actualizar inmediatamente la interfaz.
      setSecondsLeft(COOLDOWN_SECONDS);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsResending(false);
    }
  }

  const resendDisabled =
    isResending ||
    isVerifying ||
    secondsLeft === null ||
    secondsLeft > 0;

  return (
    <form
      className="mt-7"
      aria-label="Verificar correo electrónico"
      onSubmit={handleVerify}
      noValidate
    >
      <label
        htmlFor="verification-email"
        className="block text-sm font-medium"
      >
        Correo electrónico
      </label>

      <input
        id="verification-email"
        name="email"
        type="email"
        autoComplete="email"
        spellCheck={false}
        autoCapitalize="none"
        value={email}
        disabled={isVerifying || isResending}
        onChange={(event) => {
          setEmail(event.target.value);
          setSecondsLeft(null);
          setError("");
          setMessage("");
        }}
        className={`${inputClass} mt-2`}
        placeholder="tu@ejemplo.com"
        required
      />

      <label
        htmlFor="verification-code"
        className="mt-6 block text-sm font-medium"
      >
        Código de verificación
      </label>

      <input
        id="verification-code"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        disabled={isVerifying || isResending}
        onChange={(event) => {
          setCode(
            event.target.value
              .replace(/[^0-9]/g, "")
              .slice(0, 6),
          );

          setError("");
        }}
        placeholder="000000"
        className={`${inputClass} mt-2 text-center font-mono text-2xl tracking-[0.35em]`}
        aria-describedby="verification-code-help"
        required
      />

      <p
        id="verification-code-help"
        className="mt-3 text-sm leading-6 text-muted"
      >
        Revisa tu bandeja de entrada o correo no deseado.
        El código vence en 5 minutos y permite hasta
        5 intentos incorrectos.
      </p>

      <button
        type="submit"
        disabled={isVerifying || isResending}
        className="login-submit mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-[filter,box-shadow] duration-200 enabled:cursor-pointer enabled:hover:brightness-110 enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80"
      >
        {isVerifying ? "Verificando..." : "Verificar correo"}
      </button>

      <div className="mt-5 text-center">
        <p className="text-sm text-muted">
          ¿No recibiste el código?
        </p>

        <button
          type="button"
          disabled={resendDisabled}
          onClick={handleResend}
          className="mt-2 min-h-11 cursor-pointer text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
        >
          {isResending
            ? "Solicitando código..."
            : secondsLeft === null
              ? "Comprobando tiempo..."
              : secondsLeft > 0
                ? `Reenviar código en ${secondsLeft}s`
                : "Reenviar código"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 text-center text-sm text-red-500"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="mt-5 text-center text-sm text-primary"
        >
          {message}
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya verificaste tu cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}