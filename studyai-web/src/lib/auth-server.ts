import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CurrentUser } from "@/types/auth";

export async function getSessionUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get("studyai_session")?.value;

  if (!token) return null;

  try {
    return await apiFetch<CurrentUser>("auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}