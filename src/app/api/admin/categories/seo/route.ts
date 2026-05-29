import { NextResponse } from "next/server";

import { guardAdminApi } from "@/lib/admin-api-guard";
import { loadCategorySeoOverrides, updateCategorySeoInDb } from "@/lib/categories-db";

export async function GET(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  const slug = new URL(request.url).searchParams.get("slug")?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const seo = await loadCategorySeoOverrides(slug);
  return NextResponse.json({
    slug,
    seoIntro: seo?.seoIntro ?? "",
    seoFooterHtml: seo?.seoFooterHtml ?? "",
    seoMetaTitle: seo?.seoMetaTitle ?? "",
    seoMetaDescription: seo?.seoMetaDescription ?? "",
  });
}

export async function PATCH(request: Request) {
  const denied = await guardAdminApi();
  if (denied) {
    return denied;
  }

  let body: {
    slug?: string;
    seoIntro?: string;
    seoFooterHtml?: string;
    seoMetaTitle?: string;
    seoMetaDescription?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = body.slug?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  await updateCategorySeoInDb(
    slug,
    typeof body.seoIntro === "string" ? body.seoIntro : null,
    typeof body.seoFooterHtml === "string" ? body.seoFooterHtml : null,
    typeof body.seoMetaTitle === "string" ? body.seoMetaTitle : null,
    typeof body.seoMetaDescription === "string" ? body.seoMetaDescription : null,
  );

  return NextResponse.json({ ok: true });
}
