import type { NewsPostRow } from "@/lib/news-db";

export type NewsCardPost = Pick<
  NewsPostRow,
  "slug" | "title" | "excerpt" | "coverImage" | "imageAlt" | "category" | "publishedAt"
>;

/** WP-categorieën als Uncategorized/news → Nederlandse labels. */
export function normalizeNewsCategoryNl(raw: string | null | undefined): string {
  const value = String(raw || "").trim();
  if (!value) return "Nieuws";
  const key = value.toLowerCase();
  if (key === "uncategorized" || key === "ongecategoriseerd" || key === "news" || key === "blog") {
    return "Nieuws";
  }
  if (key === "nimbl") return "Nimbl";
  if (key === "tips" || key === "tip") return "Tips";
  if (key === "races" || key === "wedstrijden" || key === "race") return "Wedstrijden";
  return value;
}

export function formatNewsCategory(value: string | null | undefined): string | null {
  const label = normalizeNewsCategoryNl(value);
  return label || null;
}

export function formatNewsDate(
  value: Date | string | null | undefined,
  locale: string = "nl",
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
