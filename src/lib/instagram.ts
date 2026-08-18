import "server-only";

import { CONTENT_PHOTOS } from "@/lib/content-photos";
import type { InstagramConnectionStatus, InstagramFeedCache, InstagramPreviewPost } from "@/lib/instagram-types";
import { getPrisma } from "@/lib/prisma";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL as DEFAULT_INSTAGRAM_URL } from "@/lib/site-content";
import { getRuntimeSetting } from "@/lib/site-settings-db";

export type { InstagramConnectionStatus, InstagramFeedCache, InstagramPreviewPost };

const FEED_CACHE_KEY = "INSTAGRAM_FEED_CACHE";
const FEED_TTL_MS = 60 * 60 * 1000;
const MEDIA_FIELDS = "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username";

function normalizeProfileUrl(raw: string): string {
  const trimmed = raw.trim() || DEFAULT_INSTAGRAM_URL;
  return trimmed.replace(/\/$/, "") + "/";
}

export function instagramHandleFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\//g, "");
    if (path) return `@${path}`;
  } catch {
    // ignore
  }
  return INSTAGRAM_HANDLE;
}

export async function getInstagramPublicUrl(): Promise<string> {
  const custom = await getRuntimeSetting("INSTAGRAM_PUBLIC_URL");
  return normalizeProfileUrl(custom || DEFAULT_INSTAGRAM_URL);
}

export async function getInstagramHandle(): Promise<string> {
  const url = await getInstagramPublicUrl();
  return instagramHandleFromUrl(url);
}

function fallbackPosts(profileUrl: string): InstagramPreviewPost[] {
  return Object.values(CONTENT_PHOTOS).map((photo, index) => ({
    id: `shop-${index}`,
    imageUrl: photo.src,
    permalink: profileUrl,
    alt: photo.alt,
    caption: photo.alt,
  }));
}

function asPost(
  item: {
    id?: string;
    caption?: string;
    media_type?: string;
    media_url?: string;
    permalink?: string;
    thumbnail_url?: string;
  },
  profileUrl: string,
  index: number,
): InstagramPreviewPost | null {
  const imageUrl = item.thumbnail_url || item.media_url || "";
  if (!imageUrl) return null;
  const caption = item.caption?.trim() || "";
  return {
    id: item.id || `ig-${index}`,
    imageUrl,
    permalink: item.permalink || profileUrl,
    alt: caption || "Foto van Bergasports op Instagram",
    caption: caption || undefined,
    mediaType: item.media_type,
  };
}

async function readFeedCache(): Promise<InstagramFeedCache | null> {
  const prisma = getPrisma();
  if (!prisma) return null;
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: FEED_CACHE_KEY } });
    if (!row?.value) return null;
    const parsed = JSON.parse(row.value) as InstagramFeedCache;
    if (!Array.isArray(parsed.posts) || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeFeedCache(cache: InstagramFeedCache): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  try {
    await prisma.siteSetting.upsert({
      where: { key: FEED_CACHE_KEY },
      create: { key: FEED_CACHE_KEY, value: JSON.stringify(cache) },
      update: { value: JSON.stringify(cache) },
    });
  } catch {
    // cache is optional
  }
}

async function refreshLongLivedToken(token: string): Promise<string | null> {
  try {
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token?.trim() || null;
  } catch {
    return null;
  }
}

async function persistRefreshedToken(token: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  try {
    await prisma.siteSetting.upsert({
      where: { key: "INSTAGRAM_ACCESS_TOKEN" },
      create: { key: "INSTAGRAM_ACCESS_TOKEN", value: token },
      update: { value: token },
    });
  } catch {
    // keep using the in-memory token for this request
  }
}

type GraphMediaResponse = {
  data?: Array<{
    id?: string;
    caption?: string;
    media_type?: string;
    media_url?: string;
    permalink?: string;
    thumbnail_url?: string;
    username?: string;
  }>;
  error?: { message?: string; code?: number };
};

async function fetchGraphMedia(path: string, token: string, limit: number): Promise<GraphMediaResponse> {
  const url = `https://graph.instagram.com/${path}?fields=${MEDIA_FIELDS}&limit=${limit}&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { next: { revalidate: 1800 } });
  return (await res.json()) as GraphMediaResponse;
}

export async function fetchInstagramLiveFeed(
  limit = 6,
): Promise<{ posts: InstagramPreviewPost[]; username?: string; error?: string }> {
  const [token, userId, profileUrl] = await Promise.all([
    getRuntimeSetting("INSTAGRAM_ACCESS_TOKEN"),
    getRuntimeSetting("INSTAGRAM_USER_ID"),
    getInstagramPublicUrl(),
  ]);
  if (!token) {
    return { posts: [], error: "Geen access token" };
  }

  let access = token;
  const paths = ["me/media", userId ? `${userId}/media` : ""].filter(Boolean);
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    for (const path of paths) {
      try {
        const data = await fetchGraphMedia(path, access, limit);
        if (data.error?.message) {
          lastError = data.error.message;
          continue;
        }
        const posts = (data.data ?? [])
          .map((item, index) => asPost(item, profileUrl, index))
          .filter((post): post is InstagramPreviewPost => Boolean(post))
          .slice(0, limit);
        if (posts.length) {
          const username = data.data?.find((item) => item.username)?.username;
          return { posts, username };
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Instagram reageerde niet";
      }
    }
    if (attempt === 0) {
      const refreshed = await refreshLongLivedToken(access);
      if (!refreshed || refreshed === access) break;
      access = refreshed;
      await persistRefreshedToken(refreshed);
    }
  }

  return { posts: [], error: lastError || "Geen berichten ontvangen van Instagram" };
}

export async function getInstagramPreviewPosts(limit = 6): Promise<InstagramPreviewPost[]> {
  const profileUrl = await getInstagramPublicUrl();
  const cache = await readFeedCache();
  const cacheAge = cache ? Date.now() - new Date(cache.fetchedAt).getTime() : Number.POSITIVE_INFINITY;
  if (cache?.posts.length && cache.source === "live" && cacheAge < FEED_TTL_MS) {
    return cache.posts.slice(0, limit);
  }

  const live = await fetchInstagramLiveFeed(limit);
  if (live.posts.length) {
    await writeFeedCache({
      fetchedAt: new Date().toISOString(),
      username: live.username,
      source: "live",
      posts: live.posts,
    });
    return live.posts.slice(0, limit);
  }

  if (cache?.posts.length) {
    return cache.posts.slice(0, limit);
  }

  const fallback = fallbackPosts(profileUrl).slice(0, limit);
  await writeFeedCache({
    fetchedAt: new Date().toISOString(),
    source: "fallback",
    posts: fallback,
  });
  return fallback;
}

export async function getInstagramConnectionStatus(): Promise<InstagramConnectionStatus> {
  const [token, profileUrl, cache] = await Promise.all([
    getRuntimeSetting("INSTAGRAM_ACCESS_TOKEN"),
    getInstagramPublicUrl(),
    readFeedCache(),
  ]);
  const handle = cache?.username ? `@${cache.username}` : instagramHandleFromUrl(profileUrl);
  const posts = cache?.posts.length ? cache.posts.slice(0, 6) : fallbackPosts(profileUrl).slice(0, 6);
  return {
    configured: Boolean(token),
    profileUrl,
    handle,
    username: cache?.username,
    fetchedAt: cache?.fetchedAt,
    source: cache?.source ?? "none",
    postCount: cache?.posts.length ?? 0,
    posts,
  };
}

export async function syncInstagramFeed(limit = 6): Promise<InstagramConnectionStatus> {
  const profileUrl = await getInstagramPublicUrl();
  const live = await fetchInstagramLiveFeed(limit);
  if (live.posts.length) {
    const cache: InstagramFeedCache = {
      fetchedAt: new Date().toISOString(),
      username: live.username,
      source: "live",
      posts: live.posts,
    };
    await writeFeedCache(cache);
    return {
      configured: true,
      profileUrl,
      handle: live.username ? `@${live.username}` : instagramHandleFromUrl(profileUrl),
      username: live.username,
      fetchedAt: cache.fetchedAt,
      source: "live",
      postCount: live.posts.length,
      posts: live.posts,
    };
  }
  const fallback = fallbackPosts(profileUrl).slice(0, limit);
  await writeFeedCache({
    fetchedAt: new Date().toISOString(),
    source: "fallback",
    posts: fallback,
  });
  return {
    configured: Boolean(await getRuntimeSetting("INSTAGRAM_ACCESS_TOKEN")),
    profileUrl,
    handle: instagramHandleFromUrl(profileUrl),
    fetchedAt: new Date().toISOString(),
    source: "fallback",
    postCount: fallback.length,
    posts: fallback,
    error: live.error,
  };
}
