import "server-only";

import { redirect } from "next/navigation";

import type { AdminSession } from "@/lib/admin-auth";
import { isSuperAdminSession } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";

export async function requireAdminPage(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireSuperAdminPage(): Promise<AdminSession> {
  const session = await requireAdminPage();
  if (!isSuperAdminSession(session)) {
    redirect("/admin");
  }
  return session;
}
