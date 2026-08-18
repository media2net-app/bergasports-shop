import type { NewsPostRow } from "@/lib/news-db";

export type NewsCardPost = Pick<
  NewsPostRow,
  "slug" | "title" | "excerpt" | "coverImage" | "imageAlt" | "category" | "publishedAt"
>;

export function formatNewsDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
