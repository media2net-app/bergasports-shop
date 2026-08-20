import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { deleteAdminAttribute, updateAdminAttribute } from "@/lib/attributes-db";

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
  let body: {
    name?: string;
    slug?: string;
    type?: string;
    orderBy?: string | null;
    hasArchives?: boolean;
    sortOrder?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const attribute = await updateAdminAttribute(id, body);
    return NextResponse.json({ attribute });
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
    await deleteAdminAttribute(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Verwijderen mislukt" }, { status: 400 });
  }
}
