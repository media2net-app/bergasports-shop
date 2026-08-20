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
  "used-bikes": "tweedehands",
  wheels: "wielen",
  "scope-outlet": "scope-outlet",
  "cycling-shoes": "wielrenschoenen",
  "lafuga-wear": "lafuga-kleding",
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
  "used-bikes": "used-bikes",
  wheels: "wheels",
  "scope-outlet": "scope-outlet",
  "cycling-shoes": "cycling-shoes",
  "lafuga-wear": "lafuga-kleding",
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
  gravel: "gravelbike",
  "gravel-bike": "gravelbike",
  mtb: "mtb",
  skeelers: "speed-skates",
  tweedehands: "used-bikes",
  wielen: "wheels",
  "scope-outlet": "scope-outlet",
  wielrenschoenen: "cycling-shoes",
  "lafuga-kleding": "lafuga-wear",
  "lafuga-collectie": "lafuga-wear",
  lafuga: "lafuga-wear",
  brillen: "glasses",
  accessoires: "accessories",
  helmen: "cycling-helmets",
  schoenplaatjes: "cleats",
  groepsets: "group-sets",
  "schoenen-kleding": "schoenen-kleding",
};

/** EN public → preferred WC slug */
export const EN_TO_WC_SLUG: Record<string, string> = {
  bikes: "bikes",
  "road-bikes": "road-bike",
  gravel: "gravelbike",
  mtb: "mtb",
  "speed-skates": "speed-skates",
  "used-bikes": "used-bikes",
  wheels: "wheels",
  "scope-outlet": "scope-outlet",
  "cycling-shoes": "cycling-shoes",
  "lafuga-kleding": "lafuga-wear",
  "lafuga-collectie": "lafuga-wear",
  lafuga: "lafuga-wear",
  glasses: "glasses",
  accessories: "accessories",
  "cycling-helmets": "cycling-helmets",
  cleats: "cleats",
  "group-sets": "group-sets",
  "gravel-bike": "gravelbike",
  "schoenen-kleding": "schoenen-kleding",
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
