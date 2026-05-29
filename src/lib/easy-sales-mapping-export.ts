import "server-only";

import { matchEasySalesProductsToShop } from "@/lib/easy-sales-product-match";
import { fetchAllEasySalesProducts } from "@/lib/easy-sales-products";
import { getEasySalesConfig } from "@/lib/easy-sales";
import { fetchAllProductsRaw } from "@/lib/products-db";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export type EasySalesMappingExportResult =
  | { ok: true; csv: string; rowCount: number; matchedCount: number }
  | { ok: false; error: string };

/**
 * CSV for bulk mapping in Easy Sales (set product_website_id = shop product id).
 */
export async function buildEasySalesMappingCsv(): Promise<EasySalesMappingExportResult> {
  const config = getEasySalesConfig();
  if (!config) {
    return { ok: false, error: "Easy Sales is not configured." };
  }

  try {
    const [esProducts, shopProducts] = await Promise.all([
      fetchAllEasySalesProducts(config),
      fetchAllProductsRaw(),
    ]);

    const matches = matchEasySalesProductsToShop(esProducts, shopProducts);
    const matchByEsId = new Map(matches.map((m) => [m.es.id, m]));
    const shopById = new Map(shopProducts.map((p) => [p.id, p]));

    const header = [
      "easy_sales_id",
      "easy_sales_sku",
      "easy_sales_name",
      "current_website_id",
      "suggested_shop_id",
      "shop_name",
      "shop_wc_sku",
      "match_method",
      "match_score",
    ].join(",");

    const rows: string[] = [header];

    for (const es of esProducts) {
      const m = matchByEsId.get(es.id);
      const shop = m ? shopById.get(m.shopId) : undefined;
      rows.push(
        [
          String(es.id),
          es.sku ?? "",
          es.name ?? "",
          es.product_website_id ?? "",
          m ? String(m.shopId) : "",
          shop?.name ?? "",
          shop?.wcSku ?? "",
          m?.method ?? "",
          m ? String(Math.round(m.score * 100) / 100) : "",
        ]
          .map((c) => csvEscape(String(c)))
          .join(","),
      );
    }

    return {
      ok: true,
      csv: rows.join("\n"),
      rowCount: esProducts.length,
      matchedCount: matches.length,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return { ok: false, error: message };
  }
}
