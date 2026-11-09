let redirectPromise: Promise<void> | undefined;

export function redirectExpiredSession(): Promise<void> {
  if (!redirectPromise) {
    redirectPromise = fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    })
      .catch(() => null)
      .then(() => {
        window.location.replace("/login");
      });
  }

  return redirectPromise;
}
