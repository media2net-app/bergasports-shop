import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { deleteAdminCategory, updateAdminCategory } from "@/lib/categories-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }
  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldige id" }, { status: 400 });
  }
  let body: {
    name?: string;
    slug?: string;
    parentId?: number;
    seoIntro?: string | null;
    seoFooterHtml?: string | null;
    seoMetaTitle?: string | null;
    seoMetaDescription?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const category = await updateAdminCategory(id, {
      name: body.name ?? "",
      slug: body.slug,
      parentId: body.parentId,
      seoIntro: body.seoIntro,
      seoFooterHtml: body.seoFooterHtml,
      seoMetaTitle: body.seoMetaTitle,
      seoMetaDescription: body.seoMetaDescription,
    });
    return NextResponse.json({ category });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bijwerken mislukt" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, ctx: RouteCtx) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }
  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Ongeldige id" }, { status: 400 });
  }
  try {
    await deleteAdminCategory(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verwijderen mislukt" },
      { status: 400 },
    );
  }
}
