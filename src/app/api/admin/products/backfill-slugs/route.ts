import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { backfillAllProductSlugs } from "@/lib/products-db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  try {
    const updated = await backfillAllProductSlugs();
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backfill failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
