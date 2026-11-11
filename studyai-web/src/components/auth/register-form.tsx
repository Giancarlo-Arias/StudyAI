"use client";

import Link from "next/link";
import { PasswordInput } from "./password-input";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { validateEmail, validatePassword } from "@/lib/validations/auth";

type RegisterFields = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterErrors = Partial<Record<keyof RegisterFields, string>>;

const inputClass =
  "h-12 w-full rounded-xl border border-input-border bg-surface px-3.5 text-base text-foreground placeholder:text-muted hover:border-muted focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-focus";

// Validar los datos antes de enviarlos a Next.js.
function validateRegisterForm(data: RegisterFields): RegisterErrors {
  const errors: RegisterErrors = {};

  if (data.fullName.length < 2 || data.fullName.length > 150) {
    errors.fullName = "El nombre debe contener entre 2 y 150 caracteres.";
  }

  const emailError = validateEmail(data.email);

  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(data.password);

  if (passwordError) {
    errors.password = passwordError;
  } else if (data.password.length < 12 || data.password.length > 128) {
    errors.password = "La contraseña debe contener entre 12 y 128 caracteres.";
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (data.confirmPassword !== data.password) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}

export function RegisterForm() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<RegisterErrors>({});
  const [error, setError] = useState("");

  // Registrar el usuario y continuar con la verificación del correo.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);

    const data: RegisterFields = {
      fullName: String(formData.get("fullName") ?? "")
        .trim()
        .replace(/\s+/g, " "),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };

    const nextErrors = validateRegisterForm(data);

    setErrors(nextErrors);
    setError("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: data.fullName,
          email: data.email,
          password: data.password,
        }),
      });

      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 409) {
          setError("Ya existe una cuenta con ese correo electrónico.");
        } else if (response.status === 422) {
          setError("Revisa los datos del formulario.");
        } else {
          setError("No se pudo completar el registro. Inténtalo nuevamente.");
        }

        return;
      }

      if (
        typeof result !== "object" ||
        result === null ||
        !("success" in result) ||
        result.success !== true ||
        !("email" in result) ||
        typeof result.email !== "string"
      ) {
        setError("Respuesta inesperada del servidor.");
        return;
      }

      // Nuevo: guardar cuándo termina el bloqueo de reenvío.
      // Se conserva al recargar la página en esta pestaña.
      const normalizedEmail = result.email.trim().toLowerCase();

      const cooldownKey = `studyai:verification-cooldown:${normalizedEmail}`;

      const cooldownUntil = Date.now() + 60_000;

      try {
        sessionStorage.setItem(cooldownKey, String(cooldownUntil));
      } catch {
        // Un fallo del almacenamiento no debe impedir el registro.
        // FastAPI sigue aplicando el bloqueo de reenvío.
      }

      // Continuar hacia la pantalla de verificación.
      router.replace(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="mt-7"
      aria-label="Crear cuenta"
      method="post"
      noValidate
      onSubmit={handleSubmit}
    >
      <label htmlFor="register-name" className="block text-sm font-medium">
        Nombre completo
      </label>

      <input
        id="register-name"
        name="fullName"
        type="text"
        autoComplete="name"
        placeholder="Tu nombre completo"
        maxLength={150}
        required
        className={`${inputClass} mt-2`}
        aria-invalid={Boolean(errors.fullName)}
        aria-describedby={errors.fullName ? "register-name-error" : undefined}
      />

      {errors.fullName && (
        <p id="register-name-error" role="alert" className="mt-2 text-sm text-red-500">
          {errors.fullName}
        </p>
      )}

      <label htmlFor="register-email" className="mt-5 block text-sm font-medium">
        Correo electrónico
      </label>

      <input
        id="register-email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="tu@ejemplo.com"
        spellCheck={false}
        autoCapitalize="none"
        required
        className={`${inputClass} mt-2`}
        aria-invalid={Boolean(errors.email)}
        aria-describedby={errors.email ? "register-email-error" : undefined}
      />

      {errors.email && (
        <p id="register-email-error" role="alert" className="mt-2 text-sm text-red-500">
          {errors.email}
        </p>
      )}

      <label htmlFor="register-password" className="mt-5 block text-sm font-medium">
        Contraseña
      </label>

      <div className="relative mt-2">
        <PasswordInput
          id="register-password"
          name="password"
          autoComplete="new-password"
          placeholder="Mínimo 12 caracteres"
          minLength={12}
          maxLength={128}
          required
          className={inputClass}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "register-password-error" : undefined}
        />
      </div>

      {errors.password && (
        <p id="register-password-error" role="alert" className="mt-2 text-sm text-red-500">
          {errors.password}
        </p>
      )}

      <label htmlFor="register-confirm-password" className="mt-5 block text-sm font-medium">
        Confirmar contraseña
      </label>

      <div className="mt-2">
        <PasswordInput
          id="register-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
          required
          className={inputClass}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? "register-confirm-password-error" : undefined}
        />
      </div>

      {errors.confirmPassword && (
        <p id="register-confirm-password-error" role="alert" className="mt-2 text-sm text-red-500">
          {errors.confirmPassword}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="login-submit mt-7 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-[filter,box-shadow] duration-200 enabled:cursor-pointer enabled:hover:brightness-110 enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-80"
      >
        {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-red-500">
          {error}
        </p>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tienes una cuenta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
