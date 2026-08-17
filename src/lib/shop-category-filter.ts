import { categoryDisplayName } from "@/lib/category-meta";
import { publicCategoryPath, toCanonicalWcSlug } from "@/lib/category-slugs";
import { decodeImportedProductTitle, formatProductCardPrice, type Product } from "@/lib/products";
import {
  flattenRalexCategoryTree,
  formatRalexCategoryName,
  isExcludedShopCategorySlug,
  type RalexCategoryNode,
} from "@/lib/ralex-categories";

/** Normalize for loose match (e.g. Trendyol "Prosoape" vs Ralex slug `prosoape`). */
function slugifyCategoryLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findRalexCategoryNodeBySlug(
  tree: RalexCategoryNode[],
  slug: string,
): RalexCategoryNode | null {
  const raw = slug.trim().toLowerCase();
  if (!raw || isExcludedShopCategorySlug(raw)) {
    return null;
  }
  const target = toCanonicalWcSlug(raw);
  for (const node of flattenRalexCategoryTree(tree)) {
    if (node.slug.toLowerCase() === target || node.slug.toLowerCase() === raw) {
      return node;
    }
  }
  return null;
}

function collectFormattedCategoryLabels(node: RalexCategoryNode): string[] {
  const labels: string[] = [formatRalexCategoryName(node.name)];
  for (const child of node.children ?? []) {
    labels.push(...collectFormattedCategoryLabels(child));
  }
  return labels;
}

export type ShopCategoryMatch = {
  slug: string;
  label: string;
  labels: Set<string>;
};

/** Labels + slug for matching imported product `category` strings (admin AI images, etc.). */
export function resolveShopCategoryMatch(
  categoryTree: RalexCategoryNode[],
  catSlug: string,
): ShopCategoryMatch | null {
  const node = findRalexCategoryNodeBySlug(categoryTree, catSlug);
  if (!node) {
    return null;
  }
  return {
    slug: node.slug.toLowerCase(),
    label: formatRalexCategoryName(node.name),
    labels: new Set(collectFormattedCategoryLabels(node)),
  };
}

export function productMatchesShopCategory(
  product: { category?: string },
  match: ShopCategoryMatch,
): boolean {
  const cat = product.category ?? "";
  if (match.labels.has(cat)) {
    return true;
  }
  return slugifyCategoryLabel(cat) === match.slug;
}

function categoryDepth(node: RalexCategoryNode, byId: Map<number, RalexCategoryNode>): number {
  let depth = 0;
  let current: RalexCategoryNode | undefined = node;
  const seen = new Set<number>();
  while (current && current.parent !== 0) {
    if (seen.has(current.id)) {
      break;
    }
    seen.add(current.id);
    depth += 1;
    current = byId.get(current.parent);
  }
  return depth;
}

export type ProductShopCategoryLink = {
  slug: string;
  label: string;
  href: string;
};

/** Breadcrumb / back-link target for a product's shop category (deepest match). */
export function resolveProductShopCategory(
  product: { category?: string; wcCategories?: { slug: string }[] },
  categoryTree: RalexCategoryNode[],
): ProductShopCategoryLink | null {
  const flat = flattenRalexCategoryTree(categoryTree);
  const byId = new Map(flat.map((node) => [node.id, node]));
  const candidates: RalexCategoryNode[] = [];

  for (const wc of product.wcCategories ?? []) {
    const slug = wc.slug?.trim().toLowerCase();
    if (!slug) {
      continue;
    }
    const node = findRalexCategoryNodeBySlug(categoryTree, slug);
    if (node) {
      candidates.push(node);
    }
  }

  const catLabel = product.category?.trim();
  if (catLabel) {
    for (const node of flat) {
      const labels = new Set(collectFormattedCategoryLabels(node));
      if (labels.has(catLabel) || slugifyCategoryLabel(catLabel) === node.slug.toLowerCase()) {
        candidates.push(node);
      }
    }
  }

  if (!candidates.length) {
    return null;
  }

  const unique = new Map(candidates.map((node) => [node.id, node]));
  let best = [...unique.values()][0];
  let bestDepth = categoryDepth(best, byId);
  for (const node of unique.values()) {
    const depth = categoryDepth(node, byId);
    if (depth > bestDepth) {
      best = node;
      bestDepth = depth;
    }
  }

  return {
    slug: best.slug,
    label: formatRalexCategoryName(best.name),
    href: shopCategoryPath(best.slug),
  };
}

export type ShopCategoryResolution = {
  /** Products after category filter (or full catalog when no `cat`). */
  filteredProducts: Product[];
  /** Display name for the active category, or null when showing all. */
  categoryLabel: string | null;
  /** Canonical slug from Ralex data, or null when showing all. */
  categorySlug: string | null;
  /** True when `cat` was present but did not match any known category. */
  unknownCategory: boolean;
};

/**
 * Resolve `/shop?cat=…` against imported product `category` strings (Ralex import labels + loose slug match).
 */
export function resolveShopCategoryFilter(
  catalog: Product[],
  categoryTree: RalexCategoryNode[],
  catParam: string | null | undefined,
): ShopCategoryResolution {
  const raw = catParam?.trim();
  if (!raw) {
    return {
      filteredProducts: catalog,
      categoryLabel: null,
      categorySlug: null,
      unknownCategory: false,
    };
  }

  const node = findRalexCategoryNodeBySlug(categoryTree, raw);
  if (!node) {
    return {
      filteredProducts: [],
      categoryLabel: null,
      categorySlug: null,
      unknownCategory: true,
    };
  }

  const labelSet = new Set(collectFormattedCategoryLabels(node));
  const nodeSlug = node.slug.toLowerCase();

  const filteredProducts = catalog.filter((p) => {
    if (labelSet.has(p.category)) {
      return true;
    }
    return slugifyCategoryLabel(p.category) === nodeSlug;
  });

  return {
    filteredProducts,
    categoryLabel: categoryDisplayName(node.slug, formatRalexCategoryName(node.name)),
    categorySlug: node.slug,
    unknownCategory: false,
  };
}

export function shopListingHref(page: number, categorySlug: string | null): string {
  return buildShopListingUrl({ cat: categorySlug, page, colors: [], sizes: [], search: null });
}

export type ShopFacetOption = {
  id: string;
  label: string;
  match: RegExp;
};

/** Alleen `id` + `label` — geschikt om van Server naar Client Components te sturen (geen `RegExp`). */
export type ShopFacetChip = Pick<ShopFacetOption, "id" | "label">;

export function toShopFacetChips(facets: ShopFacetOption[]): ShopFacetChip[] {
  return facets.map(({ id, label }) => ({ id, label }));
}

function facetHaystack(product: Product): string {
  const parts = [product.name];
  if (product.wcVariations?.length) {
    for (const v of product.wcVariations) {
      parts.push(v.label);
    }
  }
  return parts.join(" ");
}

/** Herkenning in titel / variatie-label (fiets & sport). */
export const SHOP_COLOR_FACETS: ShopFacetOption[] = [
  { id: "alb", label: "Wit / ivoor", match: /\b(alb|alb-|white|ivoriu|ivory|alpine|snow)\b/i },
  { id: "bej", label: "Beige / crème", match: /\b(bej|beige|cream|taupe|nude|sand|camel)\b/i },
  { id: "gri", label: "Grijs", match: /\b(gri|gray|grey|antracit|grafit|silver)\b/i },
  { id: "negru", label: "Zwart", match: /\b(negru|black|noir)\b/i },
  { id: "roz", label: "Roze", match: /\b(roz|pink|fucsia|fuchsia|magenta|solara)\b/i },
  { id: "albastru", label: "Blauw", match: /\b(albastru|bleu|azure|turcoaz|navy|blue|marine)\b/i },
  { id: "verde", label: "Groen", match: /\b(verde|green|menta|mint|sage|olive|smarald|emerald|jungle)\b/i },
  { id: "galben", label: "Geel", match: /\b(galben|galben-|yellow|mustar|auriu)\b/i },
  { id: "portocaliu", label: "Oranje", match: /\b(portocaliu|orange|coral)\b/i },
  { id: "mov", label: "Paars", match: /\b(mov|violet|purple|lila|lavanda|plum|lila)\b/i },
  { id: "rosu", label: "Rood", match: /\b(rosu|vermel|red|burgund|bordo)\b/i },
  { id: "visiniu", label: "Bordeaux", match: /\b(vi(s|ș)iniu|visiniu|vișiniu)\b/i },
  { id: "maro", label: "Bruin", match: /\b(maro|brown|chocolate|wenge|espresso|capucino|capuccino|kaki|khaki)\b/i },
];

export const SHOP_SIZE_FACETS: ShopFacetOption[] = [
  { id: "maat-xs", label: "Maat XS", match: /\b(?:Size|Maat):\s*XS\b|\bXS\b/i },
  { id: "maat-s", label: "Maat S", match: /\b(?:Size|Maat):\s*S\b/i },
  { id: "maat-m", label: "Maat M", match: /\b(?:Size|Maat):\s*M\b/i },
  { id: "maat-l", label: "Maat L", match: /\b(?:Size|Maat):\s*L\b/i },
  { id: "maat-xl", label: "Maat XL", match: /\b(?:Size|Maat):\s*XL\b/i },
  { id: "maat-xxl", label: "Maat XXL", match: /\b(?:Size|Maat):\s*XXL\b|\bXXL\b/i },
  { id: "frame-48", label: "Frame 48 cm", match: /\b48\s*cm\b/i },
  { id: "frame-51", label: "Frame 51 cm", match: /\b51\s*cm\b/i },
  { id: "frame-54", label: "Frame 54 cm", match: /\b54\s*cm\b/i },
  { id: "frame-56", label: "Frame 56 cm", match: /\b56\s*cm\b/i },
  { id: "frame-58", label: "Frame 58 cm", match: /\b58\s*cm\b/i },
  { id: "wiel-700", label: "700C", match: /\b700\s*c\b/i },
];

const DIM_PAIR_IN_TEXT = /(\d{2,3})\s*(?:cm)?\s*[x×]\s*(\d{2,3})\s*(?:cm)?/gi;

const DYNAMIC_DIM_ID_RE = /^dim-(\d{1,3})-(\d{1,3})$/;
const EU_SHOE_SIZE_ID_RE = /^eu-(\d{2,3})$/;
/** EU 33–50; sluit skeeler-wielen uit (bijv. „Size: 4×110”). */
const EU_SHOE_SIZE_IN_TEXT =
  /\b(?:Size|Maat):\s*(3[3-9]|4[0-9]|50)(?!\s*(?:[x×]|\d)|\s*cm)\b/gi;

/** URL `marime=dim-160-200` → matcher pentru „160 x 200 cm” în nume/variații. */
export function shopDynamicSizeFacetFromId(id: string): ShopFacetOption | null {
  const m = DYNAMIC_DIM_ID_RE.exec(id);
  if (!m) {
    return null;
  }
  const w = m[1].replace(/^0+/, "") || "0";
  const h = m[2].replace(/^0+/, "") || "0";
  const wn = Number(w);
  const hn = Number(h);
  if (!Number.isFinite(wn) || !Number.isFinite(hn) || wn < 15 || hn < 15 || wn > 400 || hn > 400) {
    return null;
  }
  return {
    id,
    label: `${w} × ${h} cm`,
    match: new RegExp(`${w}\\s*(?:cm)?\\s*[x×]\\s*${h}\\s*(?:cm)?`, "i"),
  };
}

const SIZE_ID_STATIC = new Set(SHOP_SIZE_FACETS.map((f) => f.id));

function isValidShopSizeParamId(id: string): boolean {
  if (!SIZE_ID_STATIC.has(id) && !DYNAMIC_DIM_ID_RE.test(id) && !EU_SHOE_SIZE_ID_RE.test(id)) {
    return false;
  }
  const eu = EU_SHOE_SIZE_ID_RE.exec(id);
  if (eu) {
    const n = Number(eu[1]);
    return n >= 33 && n <= 50;
  }
  return true;
}

/** EU-schoenmaat uit variatielabels (bijv. „Size: 45”). */
export function shopEuShoeSizeFacetFromId(id: string): ShopFacetOption | null {
  const m = EU_SHOE_SIZE_ID_RE.exec(id);
  if (!m) {
    return null;
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 33 || n > 50) {
    return null;
  }
  return {
    id: `eu-${n}`,
    label: `EU ${n}`,
    match: new RegExp(
      `\\b(?:Size|Maat):\\s*${n}(?!\\s*(?:[x×]|\\d)|\\s*cm)\\b`,
      "i",
    ),
  };
}

function resolveSizeFacetMatchers(sizeIds: string[]): ShopFacetOption[] {
  const out: ShopFacetOption[] = [];
  for (const id of sizeIds) {
    const stat = SHOP_SIZE_FACETS.find((f) => f.id === id);
    if (stat) {
      out.push(stat);
      continue;
    }
    const eu = shopEuShoeSizeFacetFromId(id);
    if (eu) {
      out.push(eu);
      continue;
    }
    const dyn = shopDynamicSizeFacetFromId(id);
    if (dyn) {
      out.push(dyn);
    }
  }
  return out;
}

function sizeFacetSortKey(f: ShopFacetOption): number {
  const eu = EU_SHOE_SIZE_ID_RE.exec(f.id);
  if (eu) {
    return Number(eu[1]);
  }
  const frame = /^frame-(\d+)/.exec(f.id);
  if (frame) {
    return 1000 + Number(frame[1]);
  }
  return 5000;
}

function sortSizeFacets(facets: ShopFacetOption[]): ShopFacetOption[] {
  return [...facets].sort((a, b) => {
    const ka = sizeFacetSortKey(a);
    const kb = sizeFacetSortKey(b);
    if (ka !== kb) {
      return ka - kb;
    }
    return a.label.localeCompare(b.label, "nl", { numeric: true, sensitivity: "base" });
  });
}

function sortColorFacets(facets: ShopFacetOption[]): ShopFacetOption[] {
  return [...facets].sort((a, b) => a.label.localeCompare(b.label, "ro", { sensitivity: "base" }));
}

/** Mărimi prezente în pool (static + dim-160-200 din titlu/variații). */
function collectSizeFacetsFromProductPool(products: Product[]): Map<string, ShopFacetOption> {
  const byId = new Map<string, ShopFacetOption>();
  if (!products.length) {
    return byId;
  }

  for (const f of SHOP_SIZE_FACETS) {
    for (const p of products) {
      if (f.match.test(facetHaystack(p))) {
        byId.set(f.id, f);
        break;
      }
    }
  }

  const seenPairs = new Set<string>();
  for (const p of products) {
    const hay = facetHaystack(p);
    DIM_PAIR_IN_TEXT.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DIM_PAIR_IN_TEXT.exec(hay)) !== null) {
      const w = m[1].replace(/^0+/, "") || m[1];
      const h = m[2].replace(/^0+/, "") || m[2];
      const wn = Number(w);
      const hn = Number(h);
      if (!Number.isFinite(wn) || !Number.isFinite(hn) || wn < 15 || hn < 15 || wn > 400 || hn > 400) {
        continue;
      }
      const key = `${wn}-${hn}`;
      if (seenPairs.has(key)) {
        continue;
      }
      const fragment = m[0];
      if (SHOP_SIZE_FACETS.some((f) => f.match.test(fragment))) {
        seenPairs.add(key);
        continue;
      }
      const id = `dim-${wn}-${hn}`;
      const dyn = shopDynamicSizeFacetFromId(id);
      if (dyn && !byId.has(id)) {
        byId.set(id, dyn);
      }
      seenPairs.add(key);
    }
  }

  const seenEu = new Set<string>();
  for (const p of products) {
    const hay = facetHaystack(p);
    EU_SHOE_SIZE_IN_TEXT.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EU_SHOE_SIZE_IN_TEXT.exec(hay)) !== null) {
      const n = Number(m[1]);
      if (!Number.isFinite(n) || n < 33 || n > 50) {
        continue;
      }
      const id = `eu-${n}`;
      if (seenEu.has(id)) {
        continue;
      }
      const facet = shopEuShoeSizeFacetFromId(id);
      if (facet && !byId.has(id)) {
        byId.set(id, facet);
      }
      seenEu.add(id);
    }
  }

  return byId;
}

function resolveSizeFacetById(id: string): ShopFacetOption | null {
  return (
    SHOP_SIZE_FACETS.find((f) => f.id === id) ??
    shopEuShoeSizeFacetFromId(id) ??
    shopDynamicSizeFacetFromId(id)
  );
}

/**
 * Culori disponibile: cel puțin un produs în pool (categorie + căutare + mărimi selectate)
 * care se potrivesc. Filtrele deja selectate rămân vizibile ca să poți fi deselectate.
 */
export function getAvailableShopColorFacets(
  products: Product[],
  selectedColors: string[],
  selectedSizes: string[],
): ShopFacetOption[] {
  if (!products.length) {
    return [];
  }
  const pool = applyShopFacetFilters(products, [], selectedSizes);
  const selectedSet = new Set(selectedColors);
  const byId = new Map<string, ShopFacetOption>();

  for (const f of SHOP_COLOR_FACETS) {
    if (selectedSet.has(f.id)) {
      byId.set(f.id, f);
      continue;
    }
    for (const p of pool) {
      if (f.match.test(facetHaystack(p))) {
        byId.set(f.id, f);
        break;
      }
    }
  }

  return sortColorFacets([...byId.values()]);
}

/**
 * Mărimi disponibile: cel puțin un produs în pool (categorie + căutare + culori selectate).
 */
export function getAvailableShopSizeFacets(
  products: Product[],
  selectedColors: string[],
  selectedSizes: string[],
): ShopFacetOption[] {
  if (!products.length) {
    return [];
  }
  const pool = applyShopFacetFilters(products, selectedColors, []);
  const byId = collectSizeFacetsFromProductPool(pool);

  for (const id of selectedSizes) {
    if (byId.has(id)) {
      continue;
    }
    const facet = resolveSizeFacetById(id);
    if (facet) {
      byId.set(id, facet);
    }
  }

  return sortSizeFacets([...byId.values()]);
}

/** @deprecated Folosește getAvailableShopColorFacets */
export function discoverShopColorFacetsFromProducts(products: Product[]): ShopFacetOption[] {
  return getAvailableShopColorFacets(products, [], []);
}

/** @deprecated Folosește getAvailableShopSizeFacets */
export function discoverShopSizeFacetsFromProducts(products: Product[]): ShopFacetOption[] {
  return getAvailableShopSizeFacets(products, [], []);
}

export function shopColorFacetLabel(id: string): string {
  return SHOP_COLOR_FACETS.find((f) => f.id === id)?.label ?? id;
}

export function shopSizeFacetLabel(id: string): string {
  return resolveSizeFacetById(id)?.label ?? id;
}

const COLOR_ID_SET = new Set(SHOP_COLOR_FACETS.map((f) => f.id));

function parseCommaFacetIds(raw: string | null | undefined, allowed: Set<string>): string[] {
  if (!raw?.trim()) {
    return [];
  }
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => allowed.has(s));
  return [...new Set(parts)];
}

export function parseShopColorParams(raw: string | null | undefined): string[] {
  return parseCommaFacetIds(raw, COLOR_ID_SET);
}

export function parseShopSizeParams(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => isValidShopSizeParamId(s)),
    ),
  ];
}

export function applyShopFacetFilters(
  products: Product[],
  colorIds: string[],
  sizeIds: string[],
): Product[] {
  const colorTests = SHOP_COLOR_FACETS.filter((f) => colorIds.includes(f.id));
  const sizeTests = resolveSizeFacetMatchers(sizeIds);
  if (!colorTests.length && !sizeTests.length) {
    return products;
  }
  return products.filter((p) => {
    const hay = facetHaystack(p);
    if (colorTests.length && !colorTests.some((f) => f.match.test(hay))) {
      return false;
    }
    if (sizeTests.length && !sizeTests.some((f) => f.match.test(hay))) {
      return false;
    }
    return true;
  });
}

function foldSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Decodeert gangbare HTML-entiteiten in import-namen (bv. &#8211; → –). */
function decodeHtmlEntitiesForSearch(text: string): string {
  if (!text.includes("&")) {
    return text;
  }
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (full, hex: string) => {
      const cp = Number.parseInt(hex, 16);
      return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
    })
    .replace(/&#(\d+);/g, (full, dec: string) => {
      const cp = Number.parseInt(dec, 10);
      return Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : full;
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/** Eén lijn voor zoeken: strepen, ×, superscript cijfers, witruimte. */
function normalizeSearchPunctuation(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\u00b2/g, "2")
    .replace(/\u00b3/g, "3")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/[×✕✖]/g, "x")
    .replace(/\s+/g, " ")
    .trim();
}

/** Zelfde normalisatie voor query én producttekst (entity + strepen + diakriten). */
export function normalizeForShopSearch(raw: string): string {
  const decoded = decodeHtmlEntitiesForSearch(raw);
  const punct = normalizeSearchPunctuation(decoded);
  return foldSearchText(punct).trim();
}

function escapeRegExpChars(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Full-text haystack: title, brand, category, Woo category names/slugs, variation labels.
 * Diacritics folded like the search query (`normalizeForShopSearch`).
 */
export function productSearchHaystackNormalized(product: Product): string {
  const parts: string[] = [product.name];
  if (product.brand?.trim()) {
    parts.push(product.brand);
  }
  if (product.category?.trim()) {
    parts.push(product.category);
  }
  if (product.wcVariations?.length) {
    for (const v of product.wcVariations) {
      parts.push(v.label);
    }
  }
  for (const c of product.wcCategories ?? []) {
    if (c.name?.trim()) {
      parts.push(c.name);
    }
    if (c.slug?.trim()) {
      parts.push(c.slug.replace(/-/g, " "));
    }
  }
  return normalizeForShopSearch(parts.join(" "));
}

function shopSearchTokens(raw: string): string[] {
  const n = normalizeForShopSearch(raw);
  return n.split(/\s+/).filter((t) => t.length >= 2);
}

/** Substring match plus light typo tolerance (one missing char in token, RO-friendly). */
function tokenMatchesHaystackRelaxed(haystack: string, token: string): boolean {
  if (token.length < 2) {
    return false;
  }
  if (haystack.includes(token)) {
    return true;
  }
  if (token.length >= 5 && haystack.includes(token.slice(0, -1))) {
    return true;
  }
  if (token.length >= 4) {
    for (let i = 0; i < token.length; i += 1) {
      const deleted = token.slice(0, i) + token.slice(i + 1);
      if (deleted.length >= 3 && haystack.includes(deleted)) {
        return true;
      }
    }
  }
  return false;
}

function productMatchesShopSearch(product: Product, raw: string): boolean {
  const needle = normalizeForShopSearch(raw);
  if (!needle) {
    return true;
  }
  const hay = productSearchHaystackNormalized(product);
  const tokens = shopSearchTokens(raw);
  if (tokens.length === 0) {
    return hay.includes(needle);
  }
  if (tokens.length >= 2 || (tokens.length === 1 && tokens[0]!.length >= 3)) {
    return tokens.every((t) => tokenMatchesHaystackRelaxed(hay, t));
  }
  return hay.includes(needle);
}

export function scoreProductForSearch(product: Product, rawQuery: string): number {
  const trimmed = rawQuery.trim();
  const needle = normalizeForShopSearch(trimmed);
  if (!needle) {
    return Number.NEGATIVE_INFINITY;
  }
  const nameNorm = normalizeForShopSearch(product.name);
  const fullNorm = productSearchHaystackNormalized(product);
  if (!productMatchesShopSearch(product, trimmed)) {
    return Number.NEGATIVE_INFINITY;
  }
  const primary = shopSearchTokens(trimmed)[0] ?? needle;
  let score = 80;
  if (fullNorm.includes(needle)) {
    score += 130;
  }
  if (nameNorm.startsWith(primary)) {
    score += 520;
  }
  const idxName = nameNorm.indexOf(primary);
  if (idxName >= 0) {
    score += 280 - Math.min(idxName, 220);
  }
  const idxFull = fullNorm.indexOf(primary);
  score += 140 - Math.min(idxFull, 120);
  try {
    const boundary = new RegExp(`(^|[\\s(,\\-])${escapeRegExpChars(primary)}`);
    if (boundary.test(nameNorm)) {
      score += 90;
    }
  } catch {
    /* ignore */
  }
  score -= Math.min(45, Math.floor(nameNorm.length / 22));
  return score;
}

export type ShopSearchHit = {
  id: number;
  slug: string;
  name: string;
  priceLabel: string;
  image: string;
};

/**
 * Autocomplete / typeahead: minimaal 3 tekens in `rawQuery`, best match eerst.
 */
export function searchProductsRanked(
  catalog: Product[],
  rawQuery: string,
  limit: number,
): ShopSearchHit[] {
  const trimmed = rawQuery.trim();
  if (trimmed.length < 3) {
    return [];
  }
  const needle = normalizeForShopSearch(trimmed);
  if (!needle) {
    return [];
  }
  const cap = Math.min(30, Math.max(1, Math.floor(limit)));
  const candidates = applyShopSearchQuery(catalog, trimmed);
  const scored = candidates
    .map((p) => ({ p, score: scoreProductForSearch(p, trimmed) }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score);
  const seen = new Set<number>();
  const out: ShopSearchHit[] = [];
  for (const { p } of scored) {
    if (seen.has(p.id)) {
      continue;
    }
    seen.add(p.id);
    out.push({
      id: p.id,
      slug: p.slug,
      name: decodeImportedProductTitle(p.name),
      priceLabel: formatProductCardPrice(p),
      image: p.image,
    });
    if (out.length >= cap) {
      break;
    }
  }
  return out;
}

/** Filtru dupa `?q=` — titlu, brand, categorie, WC categories, variatii; token AND + typo usor. */
export function applyShopSearchQuery(products: Product[], raw: string | null | undefined): Product[] {
  const q = raw?.trim();
  if (!q) {
    return products;
  }
  return products.filter((p) => productMatchesShopSearch(p, q));
}

export type ShopListingSort = "relevance" | "price_asc" | "price_desc" | "name_asc" | "newest";

export type ShopListingQuery = {
  cat: string | null;
  page: number;
  colors: string[];
  sizes: string[];
  search?: string | null;
  sort?: ShopListingSort;
  view?: string | null;
};

/** Canonical public path for a shop category (NL aliases by default). */
export function shopCategoryPath(slug: string): string {
  return publicCategoryPath(slug, "nl");
}

export function buildShopListingUrl(query: ShopListingQuery): string {
  const params = new URLSearchParams();
  if (query.colors.length) {
    params.set("color", [...query.colors].sort().join(","));
  }
  if (query.sizes.length) {
    params.set("marime", [...query.sizes].sort().join(","));
  }
  const s = query.search?.trim();
  if (s) {
    params.set("q", s);
  }
  if (query.sort && query.sort !== "relevance") {
    params.set("sort", query.sort);
  }
  const view = query.view?.trim();
  if (view) {
    params.set("view", view);
  }
  if (query.page > 1) {
    params.set("page", String(query.page));
  }
  const qs = params.toString();
  const base = query.cat ? shopCategoryPath(query.cat) : "/shop";
  return qs ? `${base}?${qs}` : base;
}
