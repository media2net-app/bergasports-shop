import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { syncAllProductsToSupabase } from "@/lib/sync-products-supabase";

export const maxDuration = 300;

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Bulk-upsert alle producten uit `bergasports-catalog.json` naar Prisma-tabel `products`. */
export async function POST() {
  const denied = await guard();
  if (denied) {
    return denied;
  }

  try {
    const result = await syncAllProductsToSupabase();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    const status = message.includes("ontbreekt") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
