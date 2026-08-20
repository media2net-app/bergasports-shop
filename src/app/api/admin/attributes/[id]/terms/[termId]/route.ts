import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { deleteAdminAttributeTerm, updateAdminAttributeTerm } from "@/lib/attributes-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; termId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id: idStr, termId: termIdStr } = await ctx.params;
  const attributeId = Number(idStr);
  const termId = Number(termIdStr);
  if (!Number.isFinite(attributeId) || !Number.isFinite(termId)) {
    return NextResponse.json({ error: "Ongeldige id" }, { status: 400 });
  }
  let body: { name?: string; slug?: string; menuOrder?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const term = await updateAdminAttributeTerm(attributeId, termId, body);
    return NextResponse.json({ term });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bijwerken mislukt" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id: idStr, termId: termIdStr } = await ctx.params;
  const attributeId = Number(idStr);
  const termId = Number(termIdStr);
  if (!Number.isFinite(attributeId) || !Number.isFinite(termId)) {
    return NextResponse.json({ error: "Ongeldige id" }, { status: 400 });
  }
  try {
    await deleteAdminAttributeTerm(attributeId, termId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Verwijderen mislukt" }, { status: 400 });
  }
}
