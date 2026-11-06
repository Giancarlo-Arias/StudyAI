import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { DashboardResponse } from "@/types/dashboard";

export async function getDashboardData(): Promise<DashboardResponse> {
  const token = (await cookies()).get("studyai_session")?.value;

  if (!token) redirect("/login");

  return apiFetch<DashboardResponse>("dashboard", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}