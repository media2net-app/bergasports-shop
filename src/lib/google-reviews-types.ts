export type GoogleReviewQuote = {
  id: string;
  author: string;
  rating: number;
  text: string;
  publishedAt?: string;
  relativeTime?: string;
};

export type GoogleReviewsCache = {
  fetchedAt: string;
  placeId: string;
  rating?: number;
  reviewCount?: number;
  googleMapsUri?: string;
  reviews: GoogleReviewQuote[];
  error?: string;
};

export type GoogleReviewsQuoteSource = "google" | "curated" | "none";
export type GoogleReviewsRatingSource = "google" | "admin" | "none";

export type GoogleReviewsPublic = {
  rating: number | null;
  ratingCount: number | null;
  ratingSource: GoogleReviewsRatingSource;
  quotes: GoogleReviewQuote[];
  quotesSource: GoogleReviewsQuoteSource;
  mapsUrl: string;
  reviewsUrl: string;
  writeReviewUrl: string | null;
  placeId: string | null;
};

export type GoogleReviewsConnectionStatus = {
  configured: boolean;
  placeId: string;
  rating?: number;
  reviewCount?: number;
  fetchedAt?: string;
  source: "live" | "stale" | "none";
  quotes: GoogleReviewQuote[];
  reviewsUrl: string;
  error?: string;
};

export type FeaturedReviewDraft = {
  name: string;
  stars: number;
  text: string;
  date: string;
};
