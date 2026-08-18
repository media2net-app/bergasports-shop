import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { syncInstagramFeed } from "@/lib/instagram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const status = await syncInstagramFeed(6);
    return NextResponse.json({ status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync mislukt" }, { status: 500 });
  }
}
