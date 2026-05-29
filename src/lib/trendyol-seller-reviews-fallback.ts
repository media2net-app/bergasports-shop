import fallbackJson from "@/data/trendyol-seller-reviews-fallback.json";
import type { TrendyolSellerReviewsPayload } from "@/lib/trendyol-seller-reviews-fetch";

const base = fallbackJson as TrendyolSellerReviewsPayload;

/**
 * Snapshot local când Trendyol nu răspunde. Pagina > 0: fără recenzii (modal „mai multe”).
 */
export function getTrendyolSellerReviewsFallback(
  page: number,
  pageSize: number,
): TrendyolSellerReviewsPayload & { fromCache: true } {
  const capped = Math.max(5, Math.min(50, pageSize));
  if (page <= 0) {
    const reviews = base.reviews.slice(0, capped);
    return {
      ...base,
      reviews,
      page: 0,
      pageSize: capped,
      totalPages: 1,
      totalElements: base.totalElements,
      fromCache: true,
    };
  }
  return {
    ...base,
    reviews: [],
    page,
    pageSize: capped,
    totalPages: 1,
    totalElements: base.totalElements,
    fromCache: true,
  };
}
