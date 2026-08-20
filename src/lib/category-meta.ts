/**
 * Nederlandse naam + SEO-copy per categorie, gekoppeld aan de WooCommerce-slug
 * uit de import. De import levert Engelse namen ("Road bike"); hier staat wat
 * de bezoeker en Google zien. Admin-overrides in de database gaan hier vóór.
 */

import { toCanonicalWcSlug, toPublicCategorySlug } from "@/lib/category-slugs";
import { LAFUGA_HEADING, LAFUGA_META_DESCRIPTION } from "@/lib/lafuga-copy";
import { SITE_BRAND_NAME } from "@/lib/site-brand";

export type CategoryMeta = {
  /** Naam in koppen, kruimelpad en menu's. */
  name: string;
  /** Volledige SEO-titel (zonder extra suffix). */
  seoTitle: string;
  seoDescription: string;
};

const ADVICE_TAIL = `Professioneel advies en persoonlijke service vanuit Dedemsvaart.`;

export const CATEGORY_META: Record<string, CategoryMeta> = {
  bikes: {
    name: "Fietsen",
    seoTitle: `Fietsen kopen: racefiets, gravel & MTB | ${SITE_BRAND_NAME}`,
    seoDescription: `Racefietsen, gravelbikes en mountainbikes van Orbea, Colnago, Basso en Cervélo. ${ADVICE_TAIL}`,
  },
  "road-bike": {
    name: "Racefietsen",
    seoTitle: `Racefietsen kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Ontdek onze racefietsen bij ${SITE_BRAND_NAME}. Professioneel advies, hoogwaardige fietsen en persoonlijke service vanuit Dedemsvaart.`,
  },
  gravelbike: {
    name: "Gravel",
    seoTitle: `Gravelbikes kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Gravelbikes voor asfalt, grind en bospaden. ${ADVICE_TAIL}`,
  },
  "gravel-bike": {
    name: "Gravel",
    seoTitle: `Gravelbikes kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Gravelbikes voor asfalt, grind en bospaden. ${ADVICE_TAIL}`,
  },
  mtb: {
    name: "MTB",
    seoTitle: `Mountainbikes (MTB) kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Mountainbikes voor trail en cross-country, met de juiste maat en afstelling. ${ADVICE_TAIL}`,
  },
  "speed-skates": {
    name: "Skeelers",
    seoTitle: `Skeelers kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Skeelers, frames, wielen en lagers voor marathon en training. Advies van oud-topsporter Ingmar Berga uit Dedemsvaart.`,
  },
  "used-bikes": {
    name: "Tweedehands fietsen",
    seoTitle: `Tweedehands racefietsen | ${SITE_BRAND_NAME}`,
    seoDescription: `Gecontroleerde tweedehands racefietsen, nagekeken in onze eigen werkplaats. ${ADVICE_TAIL}`,
  },
  wheels: {
    name: "Wielen",
    seoTitle: `Wielen & wielsets kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Carbon wielsets en velgen voor racefiets en gravel, van Scope en meer. ${ADVICE_TAIL}`,
  },
  "scope-outlet": {
    name: "Scope Outlet",
    seoTitle: `Scope wielen outlet | ${SITE_BRAND_NAME}`,
    seoDescription: `Scope carbon wielsets met outletvoordeel, met volledige garantie. ${ADVICE_TAIL}`,
  },
  "cycling-shoes": {
    name: "Nimbl",
    seoTitle: `Wielrenschoenen kopen: Nimbl & meer | ${SITE_BRAND_NAME}`,
    seoDescription: `Wielrenschoenen van Nimbl en andere topmerken, met aandacht voor pasvorm en voetstand. ${ADVICE_TAIL}`,
  },
  "lafuga-wear": {
    name: "LaFuga kleding",
    seoTitle: `LaFuga kleding | ${SITE_BRAND_NAME}`,
    seoDescription: LAFUGA_META_DESCRIPTION,
  },
  glasses: {
    name: "Brillen",
    seoTitle: `Sportbrillen & fietsbrillen kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Fietsbrillen en sportbrillen met heldere lenzen en goede pasvorm. ${ADVICE_TAIL}`,
  },
  accessories: {
    name: "Accessoires",
    seoTitle: `Fietsaccessoires kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Helmen, brillen, schoenplaatjes, groepsets en alle andere fietsaccessoires. ${ADVICE_TAIL}`,
  },
  "cycling-helmets": {
    name: "Helmen",
    seoTitle: `Fietshelmen kopen: KASK & meer | ${SITE_BRAND_NAME}`,
    seoDescription: `Fietshelmen van onder andere KASK, met de juiste maat en ventilatie. ${ADVICE_TAIL}`,
  },
  cleats: {
    name: "Schoenplaatjes",
    seoTitle: `Schoenplaatjes kopen | ${SITE_BRAND_NAME}`,
    seoDescription: `Schoenplaatjes voor Shimano, Look en Wahoo pedalen, inclusief advies over de juiste stand. ${ADVICE_TAIL}`,
  },
  "group-sets": {
    name: "Groepsets",
    seoTitle: `Groepsets kopen: Shimano, SRAM & Campagnolo | ${SITE_BRAND_NAME}`,
    seoDescription: `Complete groepsets en onderdelen voor je racefiets of gravelbike. ${ADVICE_TAIL}`,
  },
  "schoenen-kleding": {
    name: "Schoenen & kleding",
    seoTitle: `Wielrenschoenen & fietskleding | ${SITE_BRAND_NAME}`,
    seoDescription: `Nimbl wielrenschoenen en LaFuga fietskleding, te passen in Dedemsvaart. ${ADVICE_TAIL}`,
  },
};

/** Woo/EN namen (en gangbare varianten) → NL shop-label. */
const IMPORTED_NAME_TO_NL: Record<string, string> = {
  accessories: "Accessoires",
  accessoires: "Accessoires",
  bikes: "Fietsen",
  fietsen: "Fietsen",
  cleats: "Schoenplaatjes",
  schoenplaatjes: "Schoenplaatjes",
  clothing: "LaFuga kleding",
  "cycling clothing": "LaFuga kleding",
  "cycling helmets": "Helmen",
  helmets: "Helmen",
  helmen: "Helmen",
  "cycling shoes": "Nimbl",
  wielrenschoenen: "Nimbl",
  nimbl: "Nimbl",
  glasses: "Brillen",
  brillen: "Brillen",
  gravel: "Gravel",
  "gravel bike": "Gravel",
  gravelbike: "Gravel",
  gravelbikes: "Gravel",
  "group sets": "Groepsets",
  groupsets: "Groepsets",
  groepsets: "Groepsets",
  mtb: "MTB",
  mountainbikes: "MTB",
  "road bike": "Racefietsen",
  "road bikes": "Racefietsen",
  racefietsen: "Racefietsen",
  "scope outlet": "Scope Outlet",
  "speed skates": "Skeelers",
  skeelers: "Skeelers",
  "used bikes": "Tweedehands fietsen",
  tweedehands: "Tweedehands fietsen",
  "tweedehands fietsen": "Tweedehands fietsen",
  wheels: "Wielen",
  wielen: "Wielen",
  "lafuga wear": "LaFuga kleding",
  "lafuga fietskleding": "LaFuga kleding",
  "lafuga kleding": "LaFuga kleding",
  "lafuga-kleding": "LaFuga kleding",
  "lafuga-collectie": "LaFuga kleding",
  lafuga: "LaFuga kleding",
};

/** Originele Woo-namen per canonieke slug — nodig om filters te matchen. */
const WC_IMPORTED_NAMES: Record<string, string[]> = {
  bikes: ["Bikes", "Fietsen"],
  "road-bike": ["Road bike", "Racefietsen"],
  gravelbike: ["Gravelbike", "Gravel"],
  "gravel-bike": ["Gravel bike", "Gravel"],
  mtb: ["Mtb", "MTB"],
  "speed-skates": ["Speed skates", "Skeelers"],
  "used-bikes": ["Used bikes", "Tweedehands fietsen"],
  wheels: ["Wheels", "Wielen"],
  "scope-outlet": ["Scope outlet", "Scope Outlet"],
  "cycling-shoes": ["Cycling shoes", "Wielrenschoenen", "Nimbl"],
  "lafuga-wear": ["Cycling clothing", "LaFuga", "LaFuga fietskleding", "LaFuga kleding", "LaFuga custom kleding"],
  "schoenen-kleding": ["Schoenen & kleding", "Cycling shoes", "Cycling clothing", "Nimbl", "LaFuga"],
  glasses: ["Glasses", "Brillen"],
  accessories: ["Accessories", "Accessoires"],
  "cycling-helmets": ["Cycling helmets", "Helmen", "Helmets"],
  cleats: ["Cleats", "Schoenplaatjes"],
  "group-sets": ["Group sets", "Groepsets"],
};

export function stripCategoryNamePrefix(name: string): string {
  return name.replace(/^\*\s*/, "").trim();
}

function normalizeLabelKey(name: string): string {
  return stripCategoryNamePrefix(name).toLowerCase().replace(/\s+/g, " ");
}

function metaForSlug(slug: string | null | undefined): CategoryMeta | undefined {
  if (!slug) return undefined;
  const raw = slug.trim().toLowerCase();
  if (!raw) return undefined;
  return CATEGORY_META[raw] ?? CATEGORY_META[toCanonicalWcSlug(raw)];
}

/** Nederlandse categorienaam, met de geïmporteerde naam als terugval. */
export function categoryDisplayName(slug: string | null | undefined, fallback = ""): string {
  const cleaned = stripCategoryNamePrefix(fallback);
  const meta = metaForSlug(slug);
  if (meta) return meta.name;
  return dutchLabelFromImportedName(cleaned);
}

/** Map een product- of Woo-categorienaam (vaak Engels) naar het NL-label. */
export function dutchLabelFromImportedName(name: string): string {
  const cleaned = stripCategoryNamePrefix(name);
  if (!cleaned) return cleaned;
  return IMPORTED_NAME_TO_NL[normalizeLabelKey(cleaned)] ?? cleaned;
}

/**
 * Alle namen waarmee een productcategorie mag matchen (EN import + NL UI + slugs).
 * Zo blijven filters werken als `product.category` nog "Bikes" is.
 */
export function categoryMatchLabels(slug: string | null | undefined, storedName: string): string[] {
  const labels = new Set<string>();
  const cleaned = stripCategoryNamePrefix(storedName);
  if (storedName.trim()) labels.add(storedName.trim());
  if (cleaned) labels.add(cleaned);
  labels.add(categoryDisplayName(slug, cleaned));
  labels.add(dutchLabelFromImportedName(cleaned));
  if (slug) {
    const raw = slug.trim().toLowerCase();
    const canonical = toCanonicalWcSlug(raw);
    labels.add(raw);
    labels.add(canonical);
    labels.add(toPublicCategorySlug(canonical, "nl"));
    const meta = metaForSlug(canonical);
    if (meta) labels.add(meta.name);
    for (const alias of WC_IMPORTED_NAMES[canonical] ?? []) {
      labels.add(alias);
    }
  }
  const mapped = IMPORTED_NAME_TO_NL[normalizeLabelKey(cleaned)];
  if (mapped) labels.add(mapped);
  return [...labels].filter(Boolean);
}

export function categorySeoDefaults(slug: string | null | undefined): CategoryMeta | undefined {
  return metaForSlug(slug);
}
