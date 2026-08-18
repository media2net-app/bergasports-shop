import "server-only";

import { cache } from "react";

import type {
  GoogleReviewQuote,
  GoogleReviewsCache,
  GoogleReviewsConnectionStatus,
  GoogleReviewsPublic,
} from "@/lib/google-reviews-types";
import {
  asReviewQuote,
  clampReviewRating,
  DISPLAY_QUOTE_LIMIT,
  googleReviewsUrl,
  googleWriteReviewUrl,
  normalizePlaceId,
  parseFeaturedReviewsJson,
  selectDisplayQuotes,
} from "@/lib/google-reviews-shared";
import { getPrisma } from "@/lib/prisma";
import { SHOP_MAPS_URL } from "@/lib/site-content";
import { getRuntimeSetting } from "@/lib/site-settings-db";

export type {
  FeaturedReviewDraft,
  GoogleReviewQuote,
  GoogleReviewsCache,
  GoogleReviewsConnectionStatus,
  GoogleReviewsPublic,
} from "@/lib/google-reviews-types";
export {
  draftsFromFeaturedJson,
  googleReviewsUrl,
  googleWriteReviewUrl,
  normalizePlaceId,
  parseFeaturedReviewsJson,
  selectDisplayQuotes,
  serializeFeaturedReviews,
} from "@/lib/google-reviews-shared";

const CACHE_KEY = "GOOGLE_REVIEWS_CACHE";
const CACHE_TTL_MS = 60 * 60 * 1000;
const SEARCH_QUERY = "Bergasports Julianastraat 3A 7701 GH Dedemsvaart";
const NEW_FIELD_MASK = "id,displayName,rating,userRatingCount,googleMapsUri,reviews";

function parseAdminRating(raw: string): number | null {
  const n = Number.parseFloat(raw.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n * 10) / 10;
}

function parseAdminCount(raw: string): number | null {
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

async function readCache(): Promise<GoogleReviewsCache | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: CACHE_KEY } });
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as GoogleReviewsCache;
    if (!parsed.fetchedAt || !Array.isArray(parsed.reviews)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(cacheValue: GoogleReviewsCache): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  try {
    await prisma.siteSetting.upsert({
      where: { key: CACHE_KEY },
      create: { key: CACHE_KEY, value: JSON.stringify(cacheValue) },
      update: { value: JSON.stringify(cacheValue) },
    });
  } catch {
    // cache is optional
  }
}

async function persistPlaceId(placeId: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  try {
    await prisma.siteSetting.upsert({
      where: { key: "GOOGLE_PLACE_ID" },
      create: { key: "GOOGLE_PLACE_ID", value: placeId },
      update: { value: placeId },
    });
  } catch {
    // keep using the in-memory id
  }
}

type NewPlace = {
  id?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: Array<{
    name?: string;
    rating?: number;
    publishTime?: string;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string };
  }>;
};

function quotesFromNewPlace(place: NewPlace): GoogleReviewQuote[] {
  return (place.reviews ?? [])
    .map((review, index) =>
      asReviewQuote(
        {
          id: review.name,
          author: review.authorAttribution?.displayName,
          rating: review.rating,
          text: review.text?.text || review.originalText?.text,
          publishedAt: review.publishTime,
          relativeTime: review.relativePublishTimeDescription,
        },
        index,
        "google",
      ),
    )
    .filter((quote): quote is GoogleReviewQuote => Boolean(quote));
}

function cacheFromNewPlace(place: NewPlace, placeId: string): GoogleReviewsCache | null {
  const id = normalizePlaceId(place.id) || placeId;
  const rating = typeof place.rating === "number" ? clampReviewRating(place.rating) : undefined;
  const reviewCount = typeof place.userRatingCount === "number" ? place.userRatingCount : undefined;
  if (!rating && !reviewCount && !place.reviews?.length) return null;
  return {
    fetchedAt: new Date().toISOString(),
    placeId: id,
    rating: rating || undefined,
    reviewCount,
    googleMapsUri: place.googleMapsUri,
    reviews: quotesFromNewPlace(place),
  };
}

async function fetchPlaceDetailsNew(apiKey: string, placeId: string): Promise<GoogleReviewsCache | null> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=nl`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": NEW_FIELD_MASK,
    },
    next: { revalidate: 1800 },
  });
  const data = (await res.json()) as NewPlace & { error?: { message?: string } };
  if (!res.ok || data.error?.message) {
    throw new Error(data.error?.message || `Places API (New) ${res.status}`);
  }
  return cacheFromNewPlace(data, placeId);
}

async function findPlaceIdNew(apiKey: string): Promise<string | null> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName",
    },
    body: JSON.stringify({
      textQuery: SEARCH_QUERY,
      languageCode: "nl",
      maxResultCount: 1,
    }),
    cache: "no-store",
  });
  const data = (await res.json()) as { places?: Array<{ id?: string }>; error?: { message?: string } };
  if (!res.ok || data.error?.message) {
    throw new Error(data.error?.message || `Places Text Search ${res.status}`);
  }
  return normalizePlaceId(data.places?.[0]?.id) || null;
}

type LegacyDetails = {
  status?: string;
  error_message?: string;
  result?: {
    place_id?: string;
    rating?: number;
    user_ratings_total?: number;
    url?: string;
    reviews?: Array<{
      author_name?: string;
      rating?: number;
      text?: string;
      time?: number;
      relative_time_description?: string;
    }>;
  };
};

function cacheFromLegacy(result: NonNullable<LegacyDetails["result"]>, placeId: string): GoogleReviewsCache {
  return {
    fetchedAt: new Date().toISOString(),
    placeId: result.place_id || placeId,
    rating: typeof result.rating === "number" ? clampReviewRating(result.rating) : undefined,
    reviewCount: result.user_ratings_total,
    googleMapsUri: result.url,
    reviews: (result.reviews ?? [])
      .map((review, index) =>
        asReviewQuote(
          {
            author: review.author_name,
            rating: review.rating,
            text: review.text,
            publishedAt: review.time ? new Date(review.time * 1000).toISOString() : undefined,
            relativeTime: review.relative_time_description,
          },
          index,
          "google",
        ),
      )
      .filter((quote): quote is GoogleReviewQuote => Boolean(quote)),
  };
}

async function fetchPlaceDetailsLegacy(apiKey: string, placeId: string): Promise<GoogleReviewsCache | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "place_id,name,rating,user_ratings_total,reviews,url",
    language: "nl",
    reviews_sort: "newest",
    key: apiKey,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`, {
    next: { revalidate: 1800 },
  });
  const data = (await res.json()) as LegacyDetails;
  if (data.status && data.status !== "OK") {
    throw new Error(data.error_message || data.status);
  }
  if (!data.result) return null;
  return cacheFromLegacy(data.result, placeId);
}

async function findPlaceIdLegacy(apiKey: string): Promise<string | null> {
  const params = new URLSearchParams({
    input: SEARCH_QUERY,
    inputtype: "textquery",
    fields: "place_id",
    language: "nl",
    key: apiKey,
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`, {
    next: { revalidate: 1800 },
  });
  const data = (await res.json()) as {
    status?: string;
    error_message?: string;
    candidates?: Array<{ place_id?: string }>;
  };
  if (data.status && data.status !== "OK") {
    throw new Error(data.error_message || data.status);
  }
  return normalizePlaceId(data.candidates?.[0]?.place_id) || null;
}

async function resolvePlaceId(apiKey: string, configuredId: string): Promise<string> {
  if (configuredId) return configuredId;
  try {
    const fromNew = await findPlaceIdNew(apiKey);
    if (fromNew) return fromNew;
  } catch {
    // try legacy
  }
  const fromLegacy = await findPlaceIdLegacy(apiKey);
  if (!fromLegacy) {
    throw new Error("Geen Google-locatie gevonden voor Bergasports in Dedemsvaart. Vul het Place ID handmatig in.");
  }
  return fromLegacy;
}

export async function fetchGoogleReviewsLive(): Promise<{ cache: GoogleReviewsCache | null; error?: string }> {
  const [apiKey, configuredId] = await Promise.all([
    getRuntimeSetting("GOOGLE_PLACES_API_KEY"),
    getRuntimeSetting("GOOGLE_PLACE_ID"),
  ]);
  if (!apiKey.trim()) {
    return { cache: null, error: "Geen Places API-key" };
  }

  try {
    const placeId = await resolvePlaceId(apiKey.trim(), normalizePlaceId(configuredId));
    if (!configuredId.trim() && placeId) {
      await persistPlaceId(placeId);
    }

    try {
      const fresh = await fetchPlaceDetailsNew(apiKey.trim(), placeId);
      if (fresh) return { cache: fresh };
    } catch {
      // Places API (New) is niet altijd aangezet; val terug op de klassieke Details-call.
    }

    const legacy = await fetchPlaceDetailsLegacy(apiKey.trim(), placeId);
    if (legacy) return { cache: legacy };
    return { cache: null, error: "Google gaf geen beoordelingen terug" };
  } catch (e) {
    return { cache: null, error: e instanceof Error ? e.message : "Google Places reageerde niet" };
  }
}

async function loadSettingsBundle() {
  const [apiKey, placeId, featuredJson, ratingRaw, countRaw] = await Promise.all([
    getRuntimeSetting("GOOGLE_PLACES_API_KEY"),
    getRuntimeSetting("GOOGLE_PLACE_ID"),
    getRuntimeSetting("GOOGLE_REVIEWS_FEATURED_JSON"),
    getRuntimeSetting("GOOGLE_PLACE_RATING"),
    getRuntimeSetting("GOOGLE_PLACE_RATING_COUNT"),
  ]);
  return {
    apiKey: apiKey.trim(),
    placeId: normalizePlaceId(placeId),
    featured: parseFeaturedReviewsJson(featuredJson),
    adminRating: parseAdminRating(ratingRaw),
    adminCount: parseAdminCount(countRaw),
  };
}

function toPublic(args: {
  live?: GoogleReviewsCache | null;
  featured: GoogleReviewQuote[];
  adminRating: number | null;
  adminCount: number | null;
  placeId: string;
}): GoogleReviewsPublic {
  const live = args.live;
  const placeId = normalizePlaceId(live?.placeId) || args.placeId;
  const mapsUrl = live?.googleMapsUri || SHOP_MAPS_URL;
  const liveQuotes = selectDisplayQuotes(live?.reviews ?? [], DISPLAY_QUOTE_LIMIT);
  const quotes = liveQuotes.length
    ? liveQuotes
    : selectDisplayQuotes(args.featured, DISPLAY_QUOTE_LIMIT);
  const rating =
    typeof live?.rating === "number" && live.rating > 0
      ? live.rating
      : args.adminRating;
  const ratingCount =
    typeof live?.reviewCount === "number" && live.reviewCount > 0
      ? live.reviewCount
      : args.adminCount;

  return {
    rating,
    ratingCount,
    ratingSource: typeof live?.rating === "number" && live.rating > 0 ? "google" : args.adminRating ? "admin" : "none",
    quotes,
    quotesSource: liveQuotes.length ? "google" : quotes.length ? "curated" : "none",
    mapsUrl,
    reviewsUrl: googleReviewsUrl(placeId, mapsUrl),
    writeReviewUrl: googleWriteReviewUrl(placeId),
    placeId: placeId || null,
  };
}

export const getGoogleReviewsPublic = cache(async (): Promise<GoogleReviewsPublic> => {
  const settings = await loadSettingsBundle();
  const stored = await readCache();
  const cacheAge = stored ? Date.now() - new Date(stored.fetchedAt).getTime() : Number.POSITIVE_INFINITY;
  const fresh = stored && cacheAge < CACHE_TTL_MS && stored.reviews;

  if (fresh && (stored.rating || stored.reviews.length)) {
    return toPublic({
      live: stored,
      featured: settings.featured,
      adminRating: settings.adminRating,
      adminCount: settings.adminCount,
      placeId: settings.placeId,
    });
  }

  if (settings.apiKey) {
    const live = await fetchGoogleReviewsLive();
    if (live.cache) {
      await writeCache(live.cache);
      return toPublic({
        live: live.cache,
        featured: settings.featured,
        adminRating: settings.adminRating,
        adminCount: settings.adminCount,
        placeId: settings.placeId || live.cache.placeId,
      });
    }
    if (stored && (stored.rating || stored.reviews.length)) {
      return toPublic({
        live: stored,
        featured: settings.featured,
        adminRating: settings.adminRating,
        adminCount: settings.adminCount,
        placeId: settings.placeId || stored.placeId,
      });
    }
  }

  return toPublic({
    live: stored?.rating || stored?.reviews.length ? stored : null,
    featured: settings.featured,
    adminRating: settings.adminRating,
    adminCount: settings.adminCount,
    placeId: settings.placeId,
  });
});

export async function getGooglePlaceAggregateRating(): Promise<{
  ratingValue: number;
  reviewCount: number;
} | null> {
  const data = await getGoogleReviewsPublic();
  if (data.ratingSource === "none" || data.rating == null || !data.ratingCount) {
    return null;
  }
  return { ratingValue: data.rating, reviewCount: data.ratingCount };
}

export async function getGoogleReviewsConnectionStatus(): Promise<GoogleReviewsConnectionStatus> {
  const [apiKey, placeId, stored] = await Promise.all([
    getRuntimeSetting("GOOGLE_PLACES_API_KEY"),
    getRuntimeSetting("GOOGLE_PLACE_ID"),
    readCache(),
  ]);
  const id = normalizePlaceId(stored?.placeId) || normalizePlaceId(placeId);
  return {
    configured: Boolean(apiKey.trim()),
    placeId: id,
    rating: stored?.rating,
    reviewCount: stored?.reviewCount,
    fetchedAt: stored?.fetchedAt,
    source: stored?.rating || stored?.reviews.length ? "live" : "none",
    quotes: stored?.reviews.slice(0, 5) ?? [],
    reviewsUrl: googleReviewsUrl(id || null),
    error: stored?.error,
  };
}

export async function syncGoogleReviews(): Promise<GoogleReviewsConnectionStatus> {
  const live = await fetchGoogleReviewsLive();
  if (live.cache) {
    await writeCache(live.cache);
    return {
      configured: true,
      placeId: live.cache.placeId,
      rating: live.cache.rating,
      reviewCount: live.cache.reviewCount,
      fetchedAt: live.cache.fetchedAt,
      source: "live",
      quotes: live.cache.reviews.slice(0, 5),
      reviewsUrl: googleReviewsUrl(live.cache.placeId, live.cache.googleMapsUri),
    };
  }

  const stored = await readCache();
  const placeId = normalizePlaceId(stored?.placeId) || normalizePlaceId(await getRuntimeSetting("GOOGLE_PLACE_ID"));
  if (stored && (stored.rating || stored.reviews.length)) {
    return {
      configured: Boolean((await getRuntimeSetting("GOOGLE_PLACES_API_KEY")).trim()),
      placeId,
      rating: stored.rating,
      reviewCount: stored.reviewCount,
      fetchedAt: stored.fetchedAt,
      source: "stale",
      quotes: stored.reviews.slice(0, 5),
      reviewsUrl: googleReviewsUrl(placeId, stored.googleMapsUri),
      error: live.error,
    };
  }

  return {
    configured: Boolean((await getRuntimeSetting("GOOGLE_PLACES_API_KEY")).trim()),
    placeId,
    source: "none",
    quotes: [],
    reviewsUrl: googleReviewsUrl(placeId || null),
    error: live.error || "Geen Google-reviews ontvangen",
  };
}
