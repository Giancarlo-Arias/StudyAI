import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-server";

async function HomeRedirect() {
  const user = await getSessionUser();

  redirect(user ? "/dashboard" : "/login");

  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}