import { NextResponse } from "next/server";
import { loadCatalogProducts } from "@/lib/products-db";
import { searchProductsRanked } from "@/lib/shop-category-filter";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 10;

  if (q.length < 3) {
    return NextResponse.json({ hits: [] }, { status: 200 });
  }

  const catalog = await loadCatalogProducts();
  const hits = searchProductsRanked(catalog, q, limit);
  return NextResponse.json(
    { hits },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=15",
      },
    },
  );
}
