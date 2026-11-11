export async function login(email: string, password: string) {
  return fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser() {
  return fetch("/api/auth/me", {
    cache: "no-store",
  });
}

export async function logout(): Promise<Response> {
  return fetch("/api/auth/logout", {
    method: "POST",
  });
}

// Verificar el correo mediante un código de seis dígitos.
export async function verifyEmailCode(
  email: string,
  code: string,
): Promise<Response> {
  return fetch("/api/auth/verify-email-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, code }),
  });
}

// Solicitar un nuevo código de verificación.
export async function resendVerificationCode(
  email: string,
): Promise<Response> {
  return fetch("/api/auth/resend-verification-code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
}