import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { deleteAdminBrand, updateAdminBrand } from "@/lib/brands-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldige id" }, { status: 400 });
  }
  let body: { name?: string; slug?: string; logoUrl?: string | null; visible?: boolean; sortOrder?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const brand = await updateAdminBrand(id, body);
    return NextResponse.json({ brand });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bijwerken mislukt" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldige id" }, { status: 400 });
  }
  try {
    await deleteAdminBrand(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Verwijderen mislukt" }, { status: 400 });
  }
}
