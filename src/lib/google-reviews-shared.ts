import type { FeaturedReviewDraft, GoogleReviewQuote } from "@/lib/google-reviews-types";
import { SHOP_MAPS_URL } from "@/lib/site-content";

export function clampReviewRating(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(5, Math.max(0, value));
}

export function normalizePlaceId(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";
  return trimmed.replace(/^places\//i, "");
}

export function googleReviewsUrl(placeId: string | null | undefined, mapsUrl = SHOP_MAPS_URL): string {
  const id = normalizePlaceId(placeId);
  if (!id) return mapsUrl;
  return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(id)}`;
}

export function googleWriteReviewUrl(placeId: string | null | undefined): string | null {
  const id = normalizePlaceId(placeId);
  if (!id) return null;
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}`;
}

function quoteId(prefix: string, index: number, extra = ""): string {
  const slug = extra.replace(/\s+/g, "-").slice(0, 24);
  return slug ? `${prefix}-${index}-${slug}` : `${prefix}-${index}`;
}

export const DISPLAY_QUOTE_MIN_CHARS = 40;
export const DISPLAY_QUOTE_MIN_RATING = 4;
export const DISPLAY_QUOTE_LIMIT = 4;

function quoteSortKey(quote: GoogleReviewQuote) {
  const published = quote.publishedAt ? Date.parse(quote.publishedAt) : Number.NaN;
  return {
    fiveStar: quote.rating >= 4.5 ? 1 : 0,
    publishedAt: Number.isFinite(published) ? published : 0,
    textLength: quote.text.trim().length,
  };
}

/** 5-sterren eerst, daarna ≥4, alleen met echte tekst. Geen vulling met korte kreten. */
export function selectDisplayQuotes(
  quotes: GoogleReviewQuote[],
  limit = DISPLAY_QUOTE_LIMIT,
): GoogleReviewQuote[] {
  const max = Math.max(0, limit);
  if (max === 0) return [];

  return quotes
    .filter((quote) => {
      const text = quote.text.replace(/\s+/g, " ").trim();
      return text.length >= DISPLAY_QUOTE_MIN_CHARS && quote.rating >= DISPLAY_QUOTE_MIN_RATING;
    })
    .sort((a, b) => {
      const left = quoteSortKey(a);
      const right = quoteSortKey(b);
      if (right.fiveStar !== left.fiveStar) return right.fiveStar - left.fiveStar;
      if (right.publishedAt !== left.publishedAt) return right.publishedAt - left.publishedAt;
      return right.textLength - left.textLength;
    })
    .slice(0, max);
}

export function asReviewQuote(
  input: {
    id?: string;
    author?: string;
    rating?: number;
    text?: string;
    publishedAt?: string;
    relativeTime?: string;
  },
  index: number,
  prefix: string,
): GoogleReviewQuote | null {
  const author = input.author?.trim() || "";
  const text = input.text?.trim() || "";
  const rating = clampReviewRating(input.rating ?? 0);
  if (!author || !text || rating <= 0) return null;
  return {
    id: input.id || quoteId(prefix, index, author),
    author,
    rating,
    text,
    publishedAt: input.publishedAt,
    relativeTime: input.relativeTime?.trim() || undefined,
  };
}

export function parseFeaturedReviewsJson(raw: string): GoogleReviewQuote[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const stars = Number(row.stars ?? row.rating);
        const date = typeof row.date === "string" ? row.date.trim() : "";
        return asReviewQuote(
          {
            id: typeof row.id === "string" ? row.id : undefined,
            author: typeof row.name === "string" ? row.name : typeof row.author === "string" ? row.author : "",
            rating: stars,
            text: typeof row.text === "string" ? row.text : "",
            publishedAt: date || undefined,
          },
          index,
          "curated",
        );
      })
      .filter((quote): quote is GoogleReviewQuote => Boolean(quote))
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function serializeFeaturedReviews(drafts: FeaturedReviewDraft[]): string {
  const rows = drafts
    .map((row) => ({
      name: row.name.trim(),
      stars: Math.round(clampReviewRating(Number(row.stars) || 0)),
      text: row.text.trim(),
      date: row.date.trim(),
    }))
    .filter((row) => row.name && row.text && row.stars > 0)
    .slice(0, 6);
  return JSON.stringify(rows);
}

export function draftsFromFeaturedJson(raw: string): FeaturedReviewDraft[] {
  const quotes = parseFeaturedReviewsJson(raw);
  if (!quotes.length) {
    return [{ name: "", stars: 5, text: "", date: "" }];
  }
  return quotes.map((quote) => ({
    name: quote.author,
    stars: Math.round(quote.rating) || 5,
    text: quote.text,
    date: quote.publishedAt?.slice(0, 10) ?? "",
  }));
}
