export type InstagramPreviewPost = {
  id: string;
  imageUrl: string;
  permalink: string;
  alt: string;
  caption?: string;
  mediaType?: string;
};

export type InstagramFeedCache = {
  fetchedAt: string;
  username?: string;
  source: "live" | "fallback";
  posts: InstagramPreviewPost[];
};

export type InstagramConnectionStatus = {
  configured: boolean;
  profileUrl: string;
  handle: string;
  username?: string;
  fetchedAt?: string;
  source: "live" | "fallback" | "none";
  postCount: number;
  posts: InstagramPreviewPost[];
  error?: string;
};
