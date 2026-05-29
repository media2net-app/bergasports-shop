import "server-only";

import { cookies } from "next/headers";

import {
  adminSessionCookieName,
  parseAdminSessionToken,
  type AdminSession,
} from "@/lib/admin-auth";

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName())?.value;
  if (!token) {
    return null;
  }
  return parseAdminSessionToken(token);
}
