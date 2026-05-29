import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { adminProductListQuery } from "@/lib/admin-products-list";
import { CATALOG_SOURCES, type CatalogSource } from "@/lib/products";
import { readTrendyolDatabase } from "@/lib/trendyol-json-store";

const PAGE_SIZE = 50;

async function guard() {
  const token = (await cookies()).get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const denied = await guard();
  if (denied) {
    return denied;
  }

  const url = new URL(request.url);
  const rawFilter = url.searchParams.get("source");
  const rawPage = url.searchParams.get("page");
  const qInput = url.searchParams.get("q") ?? "";

  const filter: CatalogSource | "all" =
    rawFilter && CATALOG_SOURCES.includes(rawFilter as CatalogSource) ? (rawFilter as CatalogSource) : "all";

  const requestedPage = Math.max(1, Number.parseInt(String(rawPage ?? "1"), 10) || 1);

  const db = await readTrendyolDatabase();
  const { rows, total, totalPages, page, from, to } = adminProductListQuery(db.products, {
    filter,
    q: qInput,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    filter,
    q: qInput.trim(),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages,
    from,
    to,
    products: rows,
  };

  const filename = `products-${filter === "all" ? "all" : filter}-p${page}.json`;

  return new NextResponse(`${JSON.stringify(payload, null, 2)}\n`, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
