import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { syncGoogleReviews } from "@/lib/google-reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  try {
    const status = await syncGoogleReviews();
    return NextResponse.json({ status });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync mislukt" }, { status: 500 });
  }
}
