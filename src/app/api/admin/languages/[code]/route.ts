import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { deleteShopLanguage, updateShopLanguage } from "@/lib/i18n/shop-languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { code } = await ctx.params;
  let body: { enabled?: boolean; isDefault?: boolean; name?: string; nativeName?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const language = await updateShopLanguage(decodeURIComponent(code), body);
    return NextResponse.json({ language });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bijwerken mislukt" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denied = await guardAdminApi();
  if (denied) return denied;
  const { code } = await ctx.params;
  try {
    await deleteShopLanguage(decodeURIComponent(code));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Verwijderen mislukt" }, { status: 400 });
  }
}
