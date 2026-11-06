import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-server";

async function LoginGuard({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  if (user) {
    redirect("/dashboard");
  }

  return children;
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <LoginGuard>{children}</LoginGuard>
    </Suspense>
  );
}