import type { EasySalesCatalogProduct } from "@/lib/easy-sales-products";
import type { TrendyolJsonProduct } from "@/lib/products";

const NAME_MATCH_MIN_SCORE = 0.38;
const NAME_MATCH_MIN_GAP = 0.05;

export function normalizeSkuKey(sku: string | undefined): string | null {
  const raw = sku?.trim().toLowerCase();
  if (!raw) return null;
  const stripped = raw.replace(/^0+/, "") || "0";
  return stripped;
}

function tokenizeName(name: string): Set<string> {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ");
  const tokens = normalized.split(" ").filter((w) => w.length > 3);
  return new Set(tokens);
}

/** Jaccard similarity on significant name tokens (Romanian titles). */
export function productNameSimilarity(a: string, b: string): number {
  const A = tokenizeName(a);
  const B = tokenizeName(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) {
    if (B.has(t)) inter++;
  }
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

export type EasySalesShopMatch = {
  shopId: number;
  es: EasySalesCatalogProduct;
  method: "website_id" | "sku" | "name";
  score: number;
};

type MatchCandidate = EasySalesShopMatch;

/**
 * Map Easy Sales rows to shop product ids (one ES product per shop product max).
 */
export function matchEasySalesProductsToShop(
  esProducts: EasySalesCatalogProduct[],
  shopProducts: TrendyolJsonProduct[],
): EasySalesShopMatch[] {
  const shopById = new Map<number, TrendyolJsonProduct>();
  const shopIdBySku = new Map<string, number>();

  for (const p of shopProducts) {
    shopById.set(p.id, p);
    const skuKey = normalizeSkuKey(p.wcSku);
    if (skuKey && !shopIdBySku.has(skuKey)) {
      shopIdBySku.set(skuKey, p.id);
    }
  }

  const candidates: MatchCandidate[] = [];

  for (const es of esProducts) {
    const websiteId = Number(es.product_website_id?.trim());
    if (Number.isFinite(websiteId) && websiteId > 0 && shopById.has(websiteId)) {
      candidates.push({ shopId: websiteId, es, method: "website_id", score: 1 });
      continue;
    }

    const esSku = normalizeSkuKey(es.sku);
    if (esSku && shopIdBySku.has(esSku)) {
      candidates.push({ shopId: shopIdBySku.get(esSku)!, es, method: "sku", score: 0.99 });
      continue;
    }

    const esName = es.name?.trim() ?? "";
    if (!esName) continue;

    let bestScore = 0;
    let secondScore = 0;
    let bestId = 0;
    for (const shop of shopProducts) {
      const score = productNameSimilarity(esName, shop.name ?? "");
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        bestId = shop.id;
      } else if (score > secondScore) {
        secondScore = score;
      }
    }

    if (
      bestId > 0 &&
      bestScore >= NAME_MATCH_MIN_SCORE &&
      bestScore - secondScore >= NAME_MATCH_MIN_GAP
    ) {
      candidates.push({ shopId: bestId, es, method: "name", score: bestScore });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const usedShop = new Set<number>();
  const usedEs = new Set<number>();
  const out: EasySalesShopMatch[] = [];

  for (const c of candidates) {
    if (usedShop.has(c.shopId) || usedEs.has(c.es.id)) continue;
    usedShop.add(c.shopId);
    usedEs.add(c.es.id);
    out.push(c);
  }

  return out;
}
