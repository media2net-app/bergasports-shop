import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { createAdminAttributeTerm } from "@/lib/attributes-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id: idStr } = await ctx.params;
  const attributeId = Number(idStr);
  if (!Number.isFinite(attributeId)) {
    return NextResponse.json({ error: "Ongeldige id" }, { status: 400 });
  }
  let body: { name?: string; slug?: string; menuOrder?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const term = await createAdminAttributeTerm(attributeId, {
      name: body.name ?? "",
      slug: body.slug,
      menuOrder: body.menuOrder,
    });
    return NextResponse.json({ term });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Aanmaken mislukt" }, { status: 400 });
  }
}
