import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { parseProductAiImageOverlay } from "@/lib/ai-image-overlay";
import { loadRalexCategories } from "@/lib/categories-db";
import {
  productMatchesShopCategory,
  resolveShopCategoryMatch,
} from "@/lib/shop-category-filter";
import { readTrendyolDatabase } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await guard();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const categorySlug = (searchParams.get("category") ?? "").trim();
  const templateId = (searchParams.get("templateId") ?? "").trim();
  const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? 25) || 25));

  if (!categorySlug) {
    return NextResponse.json({
      categorySlug: null,
      categoryLabel: null,
      templateId: templateId || null,
      count: 0,
      products: [],
    });
  }

  try {
    const [db, categories] = await Promise.all([readTrendyolDatabase(), loadRalexCategories()]);
    const match = resolveShopCategoryMatch(categories.tree, categorySlug);
    if (!match) {
      return NextResponse.json({
        categorySlug,
        categoryLabel: null,
        unknownCategory: true,
        count: 0,
        products: [],
      });
    }

    let products = db.products.filter(
      (p) => (p.catalogSource ?? "trendyol") === "ralex" && productMatchesShopCategory(p, match),
    );

    if (q) {
      products = products.filter((p) => {
        const hay = `${p.name} ${p.category ?? ""} ${p.wcSku ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }

    products = products.filter((p) => Boolean(p.image?.trim())).slice(0, limit);

    const rows = products.map((p) => {
      const parsed = parseProductAiImageOverlay(p);
      if (!parsed.productTitleRo && match.label) {
        parsed.productTitleRo = match.label.toUpperCase();
      }

      return {
        id: p.id,
        name: p.name,
        category: p.category ?? "",
        image: p.image,
        catalogSource: p.catalogSource ?? "ralex",
        overlay: parsed,
        parseNotes: parsed.parseNotes,
      };
    });

    return NextResponse.json({
      categorySlug: match.slug,
      categoryLabel: match.label,
      templateId: templateId || null,
      count: rows.length,
      products: rows,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to read catalog";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
