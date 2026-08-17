import "server-only";

import { getRuntimeSetting } from "@/lib/site-settings-db";
import { INSTAGRAM_URL as DEFAULT_INSTAGRAM_URL } from "@/lib/site-content";

export type InstagramPreviewPost = {
  id: string;
  imageUrl: string;
  permalink?: string;
};

export async function getInstagramPublicUrl(): Promise<string> {
  const custom = await getRuntimeSetting("INSTAGRAM_PUBLIC_URL");
  const raw = (custom || DEFAULT_INSTAGRAM_URL).trim();
  return raw.replace(/\/$/, "") + "/";
}

/**
 * Instagram preview for homepage.
 * Uses curated fallbacks until INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID are set.
 */
export async function getInstagramPreviewPosts(limit = 6): Promise<InstagramPreviewPost[]> {
  const token = await getRuntimeSetting("INSTAGRAM_ACCESS_TOKEN");
  const userId = await getRuntimeSetting("INSTAGRAM_USER_ID");
  const profileUrl = await getInstagramPublicUrl();

  if (token && userId) {
    try {
      const url = `https://graph.instagram.com/${userId}/media?fields=id,media_url,permalink,media_type,thumbnail_url&access_token=${encodeURIComponent(token)}&limit=${limit}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = (await res.json()) as {
          data?: Array<{
            id: string;
            media_url?: string;
            thumbnail_url?: string;
            permalink?: string;
            media_type?: string;
          }>;
        };
        return (data.data ?? [])
          .map((item) => ({
            id: item.id,
            imageUrl: item.thumbnail_url || item.media_url || "",
            permalink: item.permalink,
          }))
          .filter((p) => p.imageUrl)
          .slice(0, limit);
      }
    } catch {
      // fall through
    }
  }

  return Array.from({ length: limit }, (_, i) => ({
    id: `placeholder-${i}`,
    imageUrl: `https://placehold.co/600x600/1a1a1a/c9a227/png?text=Bergasports+${i + 1}`,
    permalink: profileUrl,
  }));
}
