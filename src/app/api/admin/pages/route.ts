import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { listSitePages } from "@/lib/site-pages-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }
  try {
    const pages = await listSitePages();
    return NextResponse.json({ pages });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load pages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
