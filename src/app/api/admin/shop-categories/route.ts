import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { createAdminCategory, listAdminCategories } from "@/lib/categories-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }
  try {
    const categories = await listAdminCategories();
    return NextResponse.json({ categories });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Kon categorieën niet laden" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }
  let body: {
    name?: string;
    slug?: string;
    parentId?: number;
    seoIntro?: string | null;
    seoFooterHtml?: string | null;
    seoMetaTitle?: string | null;
    seoMetaDescription?: string | null;
    translations?: import("@/lib/i18n/translations").LocaleMap<
      import("@/lib/i18n/translations").CategoryLocaleFields
    >;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  try {
    const category = await createAdminCategory({
      name: body.name ?? "",
      slug: body.slug,
      parentId: body.parentId,
      seoIntro: body.seoIntro,
      seoFooterHtml: body.seoFooterHtml,
      seoMetaTitle: body.seoMetaTitle,
      seoMetaDescription: body.seoMetaDescription,
      translations: body.translations,
    });
    return NextResponse.json({ category });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Aanmaken mislukt" },
      { status: 400 },
    );
  }
}
