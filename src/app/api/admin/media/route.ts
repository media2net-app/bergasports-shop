import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { listMediaAssets, updateMediaAssetAlt } from "@/lib/media-assets-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const assets = await listMediaAssets(120);
  return NextResponse.json({ assets });
}

export async function PATCH(request: Request) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  let body: { id?: string; alt?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id ontbreekt" }, { status: 400 });
  }
  await updateMediaAssetAlt(body.id, body.alt ?? "");
  return NextResponse.json({ ok: true });
}
