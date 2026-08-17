import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Ping Prisma Postgres — confirms DATABASE_URL + reachability. */
export async function GET() {
  const denied = await guard();
  if (denied) {
    return denied;
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({
      ok: false,
      label: "Niet ingesteld",
      detail: "DATABASE_URL ontbreekt",
    });
  }

  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - started;

    return NextResponse.json({
      ok: true,
      label: "Verbonden",
      detail: "Prisma Postgres bereikbaar",
      latencyMs,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({
      ok: false,
      label: "Geen verbinding",
      detail: message,
      latencyMs: Date.now() - started,
    });
  }
}
