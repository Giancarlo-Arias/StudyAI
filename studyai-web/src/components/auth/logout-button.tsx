"use client";

import { useState } from "react";
import { logout } from "@/lib/auth";

export function LogoutButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await logout();

      if (!response.ok) {
        setError("No se pudo cerrar la sesión.");
        return;
      }

      window.location.replace("/login");
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isSubmitting}
        className="workspace-action"
      >
        {isSubmitting ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
