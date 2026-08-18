import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { searchAdminProducts } from "@/lib/admin-product-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 10;

  try {
    const hits = await searchAdminProducts(q, limit);
    return NextResponse.json({ hits });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Zoeken mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
