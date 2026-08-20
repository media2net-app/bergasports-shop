import type { InstagramPostDraft, InstagramPreviewPost } from "@/lib/instagram-types";

export const INSTAGRAM_POST_LIMIT = 6;

function asPost(
  item: {
    id?: string;
    permalink?: string;
    imageUrl?: string;
    caption?: string;
    alt?: string;
    mediaType?: string;
  },
  index: number,
  profileUrl: string,
): InstagramPreviewPost | null {
  const imageUrl = item.imageUrl?.trim() || "";
  if (!imageUrl) return null;
  const permalink = item.permalink?.trim() || profileUrl;
  const caption = item.caption?.trim() || "";
  const alt = item.alt?.trim() || caption || "Foto van Bergasports op Instagram";
  return {
    id: item.id?.trim() || `ig-${index}`,
    imageUrl,
    permalink,
    alt,
    caption: caption || undefined,
    mediaType: item.mediaType,
  };
}

export function parseInstagramPostsJson(raw: string, profileUrl = ""): InstagramPreviewPost[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        return asPost(
          {
            id: typeof row.id === "string" ? row.id : undefined,
            permalink: typeof row.permalink === "string" ? row.permalink : undefined,
            imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : undefined,
            caption: typeof row.caption === "string" ? row.caption : undefined,
            alt: typeof row.alt === "string" ? row.alt : undefined,
            mediaType: typeof row.mediaType === "string" ? row.mediaType : undefined,
          },
          index,
          profileUrl,
        );
      })
      .filter((post): post is InstagramPreviewPost => Boolean(post))
      .slice(0, INSTAGRAM_POST_LIMIT);
  } catch {
    return [];
  }
}

export function serializeInstagramPosts(drafts: InstagramPostDraft[]): string {
  const rows = drafts
    .map((row) => ({
      permalink: row.permalink.trim(),
      imageUrl: row.imageUrl.trim(),
      caption: row.caption.trim(),
    }))
    .filter((row) => row.imageUrl)
    .slice(0, INSTAGRAM_POST_LIMIT);
  return JSON.stringify(rows);
}

export function draftsFromInstagramPostsJson(raw: string): InstagramPostDraft[] {
  const posts = parseInstagramPostsJson(raw);
  if (!posts.length) {
    return [{ permalink: "", imageUrl: "", caption: "" }];
  }
  return posts.map((post) => ({
    permalink: post.permalink,
    imageUrl: post.imageUrl,
    caption: post.caption ?? "",
  }));
}

export function isInstagramPostUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return false;
    return /^\/(p|reel|tv)\//i.test(url.pathname);
  } catch {
    return false;
  }
}

/** Username without @, from a profile URL. */
export function instagramUsernameFromUrl(url: string, fallback = "bergasportsnl"): string {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
    const first = path.split("/")[0]?.trim() ?? "";
    if (first && !["p", "reel", "tv", "stories", "explore"].includes(first.toLowerCase())) {
      return first.replace(/^@/, "");
    }
  } catch {
    // ignore
  }
  return fallback.replace(/^@/, "");
}
