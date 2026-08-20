/**
 * Publieke NL/EN category-slugs ↔ WooCommerce canonieke slugs.
 * DB/import blijft WC-slug; storefront-links gebruiken locale-publieke slugs.
 */

import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/locale-shared";

export type { AppLocale };

/** WC slug → NL public slug */
export const WC_TO_NL_SLUG: Record<string, string> = {
  bikes: "fietsen",
  "road-bike": "racefietsen",
  gravelbike: "gravel",
  "gravel-bike": "gravel",
  mtb: "mtb",
  "speed-skates": "skeelers",
  "skate-bearings": "skeeler-lagers",
  "skate-shoes": "skeeler-schoenen",
  "skate-wheels": "skeeler-wielen",
  "complete-skates": "complete-skeelers",
  "used-bikes": "tweedehands",
  wheels: "wielen",
  "scope-outlet": "scope-outlet",
  "cycling-shoes": "wielrenschoenen",
  "lafuga-wear": "kleding",
  glasses: "brillen",
  accessories: "accessoires",
  "cycling-helmets": "helmen",
  cleats: "schoenplaatjes",
  "group-sets": "groepsets",
  "schoenen-kleding": "schoenen-kleding",
};

/** WC slug → EN public slug */
export const WC_TO_EN_SLUG: Record<string, string> = {
  bikes: "bikes",
  "road-bike": "road-bikes",
  gravelbike: "gravel",
  "gravel-bike": "gravel",
  mtb: "mtb",
  "speed-skates": "speed-skates",
  "skate-bearings": "skate-bearings",
  "skate-shoes": "skate-shoes",
  "skate-wheels": "skate-wheels",
  "complete-skates": "complete-skates",
  "used-bikes": "used-bikes",
  wheels: "wheels",
  "scope-outlet": "scope-outlet",
  "cycling-shoes": "cycling-shoes",
  "lafuga-wear": "kleding",
  glasses: "glasses",
  accessories: "accessories",
  "cycling-helmets": "cycling-helmets",
  cleats: "cleats",
  "group-sets": "group-sets",
  "schoenen-kleding": "schoenen-kleding",
};

/** NL public → preferred WC slug */
export const NL_TO_WC_SLUG: Record<string, string> = {
  fietsen: "bikes",
  racefietsen: "road-bike",
  /** WPML/oude NL-categorie-slugs (Woo) */
  wegfietsen: "road-bike",
  gravel: "gravelbike",
  "gravel-bike": "gravelbike",
  gravelfiets: "gravelbike",
  gravelfietsen: "gravelbike",
  mtb: "mtb",
  skeelers: "speed-skates",
  "skeeler-lagers": "skate-bearings",
  lagers: "skate-bearings",
  "skeeler-schoenen": "skate-shoes",
  "skeeler-wielen": "skate-wheels",
  "complete-skeelers": "complete-skates",
  tweedehands: "used-bikes",
  "gebruikte-fietsen": "used-bikes",
  wielen: "wheels",
  "scope-outlet": "scope-outlet",
  wielrenschoenen: "cycling-shoes",
  "wielrenschoenen-v2": "cycling-shoes",
  fietsschoenen: "cycling-shoes",
  schoenen: "cycling-shoes",
  kleding: "lafuga-wear",
  "lafuga-kleding": "lafuga-wear",
  "lafuga-collectie": "lafuga-wear",
  lafuga: "lafuga-wear",
  brillen: "glasses",
  accessoires: "accessories",
  helmen: "cycling-helmets",
  fietshelmen: "cycling-helmets",
  schoenplaatjes: "cleats",
  "cleats-nl": "cleats",
  groepsets: "group-sets",
  fietsgroepen: "group-sets",
  "groep-sets": "group-sets",
  "bike-groups": "group-sets",
  "schoenen-kleding": "cycling-shoes",
};

/** EN public → preferred WC slug */
export const EN_TO_WC_SLUG: Record<string, string> = {
  bikes: "bikes",
  "road-bikes": "road-bike",
  gravel: "gravelbike",
  mtb: "mtb",
  "speed-skates": "speed-skates",
  "skate-bearings": "skate-bearings",
  "skate-shoes": "skate-shoes",
  "skate-wheels": "skate-wheels",
  "complete-skates": "complete-skates",
  "used-bikes": "used-bikes",
  wheels: "wheels",
  "scope-outlet": "scope-outlet",
  "cycling-shoes": "cycling-shoes",
  shoes: "cycling-shoes",
  apparel: "lafuga-wear",
  clothing: "lafuga-wear",
  kleding: "lafuga-wear",
  "lafuga-kleding": "lafuga-wear",
  "lafuga-collectie": "lafuga-wear",
  lafuga: "lafuga-wear",
  glasses: "glasses",
  accessories: "accessories",
  "cycling-helmets": "cycling-helmets",
  cleats: "cleats",
  "group-sets": "group-sets",
  "gravel-bike": "gravelbike",
  "schoenen-kleding": "cycling-shoes",
};

export function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

/** Resolve any public or WC slug to the canonieke WC slug used in DB. */
export function toCanonicalWcSlug(slug: string, locale: AppLocale = DEFAULT_LOCALE): string {
  const s = normalizeCategorySlug(slug);
  if (!s) return s;
  if (locale === "en") {
    return EN_TO_WC_SLUG[s] ?? NL_TO_WC_SLUG[s] ?? s;
  }
  return NL_TO_WC_SLUG[s] ?? EN_TO_WC_SLUG[s] ?? s;
}

/** Public path slug for links. */
export function toPublicCategorySlug(wcOrAnySlug: string, _locale: AppLocale = DEFAULT_LOCALE): string {
  // Zelfde publieke URL op .nl en .com (NL-slugs).
  const canonical = toCanonicalWcSlug(wcOrAnySlug, DEFAULT_LOCALE);
  return WC_TO_NL_SLUG[canonical] ?? canonical;
}

export function publicCategoryPath(wcOrAnySlug: string, locale: AppLocale = DEFAULT_LOCALE): string {
  const pub = toPublicCategorySlug(wcOrAnySlug, locale);
  return pub ? `/${pub}` : "/shop";
}
