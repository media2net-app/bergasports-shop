import { NextResponse } from "next/server";

import { getProductsRawByIds } from "@/lib/products-db";
import { mapTrendyolJsonToProduct } from "@/lib/products";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids")?.trim() ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!ids.length) {
    return NextResponse.json({ products: [] });
  }

  const raw = await getProductsRawByIds(ids);
  return NextResponse.json({
    products: raw.map(mapTrendyolJsonToProduct),
  });
}
