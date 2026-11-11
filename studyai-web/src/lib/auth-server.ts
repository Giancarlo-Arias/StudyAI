import "server-only";

import { navigation } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
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
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  await navigation();
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
