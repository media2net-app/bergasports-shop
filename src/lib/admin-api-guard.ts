import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  adminSessionCookieName,
  isSuperAdminSession,
  parseAdminSessionToken,
  type AdminSession,
} from "@/lib/admin-auth";

export async function getAdminSessionFromRequest(): Promise<AdminSession | null> {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token) {
    return null;
  }
  return parseAdminSessionToken(token);
}

export async function guardAdminApi() {
  const session = await getAdminSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function guardSuperAdminApi() {
  const session = await getAdminSessionFromRequest();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdminSession(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
