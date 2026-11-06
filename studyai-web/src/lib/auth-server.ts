import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CurrentUser } from "@/types/auth";

export async function requireUser(): Promise<CurrentUser> {
  const token = (await cookies()).get("studyai_session")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    return await apiFetch<CurrentUser>("auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    redirect("/login");
  }
}