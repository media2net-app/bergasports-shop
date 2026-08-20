import { slugifyNl } from "@/lib/slugify";

export type ShopAttributeTerm = {
  id: number;
  attributeId: number;
  name: string;
  slug: string;
  menuOrder: number;
};

export type ShopAttribute = {
  id: number;
  name: string;
  slug: string;
  type: string;
  orderBy: string | null;
  hasArchives: boolean;
  sortOrder: number;
  terms: ShopAttributeTerm[];
};

export function attributeSlugFromName(name: string): string {
  const base = slugifyNl(name);
  if (!base) return "attribuut";
  return base.startsWith("pa_") ? base : `pa_${base}`;
}

export function attributeTermSlugFromName(name: string): string {
  return slugifyNl(name) || "term";
}
