export type InstagramPreviewPost = {
  id: string;
  imageUrl: string;
  permalink: string;
  alt: string;
  caption?: string;
  mediaType?: string;
};

export type InstagramPostDraft = {
  permalink: string;
  imageUrl: string;
  caption: string;
};

export type InstagramFeedSource = "live" | "curated" | "cache" | "none";

export type InstagramFeedStatus = {
  profileUrl: string;
  handle: string;
  postCount: number;
  posts: InstagramPreviewPost[];
  /** True when Graph token is set (custom grid can sync live). */
  configured: boolean;
  username?: string;
  fetchedAt?: string;
  source: InstagramFeedSource;
  error?: string;
};

/** @deprecated Use InstagramFeedStatus */
export type InstagramConnectionStatus = InstagramFeedStatus;

export type InstagramFeedCache = {
  fetchedAt: string;
  username?: string;
  source: "live" | "curated" | "cache";
  posts: InstagramPreviewPost[];
};
