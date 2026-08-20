export const MARKETING_CHANNEL_IDS = [
  "tiktok",
  "meta",
  "google_ads",
  "google_merchant",
  "email",
] as const;

export type MarketingChannelId = (typeof MARKETING_CHANNEL_IDS)[number];

export type MarketingChannelConfig = {
  id: MarketingChannelId;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  /** Env var names checked for “connected” */
  envKeys: string[];
  externalDashboardUrl?: string;
  externalDashboardLabel?: string;
  /** Brand profile (e.g. TikTok @handle) for creative review */
  profileUrl?: string;
  profileLabel?: string;
};

export const MARKETING_CHANNELS: MarketingChannelConfig[] = [
  {
    id: "tiktok",
    label: "TikTok",
    shortLabel: "TikTok",
    description: "Pixel, Events API, catalog feed, and short-video campaigns.",
    href: "/admin/marketing/tiktok",
    envKeys: ["NEXT_PUBLIC_TIKTOK_PIXEL_ID", "TIKTOK_EVENTS_API_ACCESS_TOKEN"],
    externalDashboardUrl: "https://ads.tiktok.com/",
    externalDashboardLabel: "TikTok Ads Manager",
    profileUrl: "https://www.tiktok.com/@estorehouse.ro",
    profileLabel: "@estorehouse.ro",
  },
  {
    id: "meta",
    label: "Meta (Facebook & Instagram)",
    shortLabel: "Meta",
    description: "Meta Pixel, catalog ads, and Advantage+ campaigns.",
    href: "/admin/marketing/meta",
    envKeys: ["NEXT_PUBLIC_META_PIXEL_ID"],
    externalDashboardUrl: "https://business.facebook.com/adsmanager",
    externalDashboardLabel: "Meta Ads Manager",
    profileUrl: "https://www.facebook.com/estorehouse.ro",
    profileLabel: "Facebook page",
  },
  {
    id: "google_ads",
    label: "Google Ads",
    shortLabel: "Google Ads",
    description: "Search, Shopping, and Performance Max campaigns.",
    href: "/admin/marketing/google-ads",
    envKeys: ["NEXT_PUBLIC_GOOGLE_ADS_ID"],
    externalDashboardUrl: "https://ads.google.com/",
    externalDashboardLabel: "Google Ads",
    profileUrl: "https://www.estorehouse.ro/shop",
    profileLabel: "Shop landing",
  },
  {
    id: "google_merchant",
    label: "Google Merchant Center",
    shortLabel: "Merchant",
    description: "Product feed, free listings, and Shopping ads eligibility.",
    href: "/admin/marketing/google-merchant",
    envKeys: ["GOOGLE_MERCHANT_CENTER_ID"],
    externalDashboardUrl: "https://merchants.google.com/",
    externalDashboardLabel: "Merchant Center",
    profileUrl: "/admin/products",
    profileLabel: "Catalog (admin)",
  },
  {
    id: "email",
    label: "Email & CRM",
    shortLabel: "Email",
    description: "Welcome, post-purchase, win-back flows and consent-based CRM.",
    href: "/admin/marketing/email",
    envKeys: [],
    externalDashboardUrl: "/admin/email",
    externalDashboardLabel: "Email previews",
    profileUrl: "/admin/marketing",
    profileLabel: "Cron & overview",
  },
];

export function getMarketingChannel(id: string): MarketingChannelConfig | null {
  return MARKETING_CHANNELS.find((c) => c.id === id) ?? null;
}

export function isMarketingChannelId(id: string): id is MarketingChannelId {
  return (MARKETING_CHANNEL_IDS as readonly string[]).includes(id);
}

/** URL segment under `/admin/marketing/[slug]` */
export const MARKETING_CHANNEL_SLUGS: Record<MarketingChannelId, string> = {
  tiktok: "tiktok",
  meta: "meta",
  google_ads: "google-ads",
  google_merchant: "google-merchant",
  email: "email",
};

const SLUG_TO_ID = Object.fromEntries(
  Object.entries(MARKETING_CHANNEL_SLUGS).map(([id, slug]) => [slug, id]),
) as Record<string, MarketingChannelId>;

export function marketingChannelSlug(id: MarketingChannelId): string {
  return MARKETING_CHANNEL_SLUGS[id];
}

export function marketingChannelIdFromSlug(slug: string): MarketingChannelId | null {
  return SLUG_TO_ID[slug] ?? null;
}

/** Human-readable labels for env keys shown in admin */
export const MARKETING_ENV_LABELS: Record<string, string> = {
  NEXT_PUBLIC_TIKTOK_PIXEL_ID: "TikTok Pixel",
  TIKTOK_EVENTS_API_ACCESS_TOKEN: "Events API",
  NEXT_PUBLIC_META_PIXEL_ID: "Meta Pixel",
  NEXT_PUBLIC_GOOGLE_ADS_ID: "Google Ads tag",
  GOOGLE_ADS_DEVELOPER_TOKEN: "Ads Developer Token",
  GOOGLE_ADS_CLIENT_ID: "Google OAuth Client ID",
  GOOGLE_ADS_CLIENT_SECRET: "Google OAuth Secret",
  GOOGLE_ADS_REFRESH_TOKEN: "Google OAuth Refresh Token",
  GOOGLE_ADS_CUSTOMER_ID: "Ads Customer ID",
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: "Ads Login Customer (MCC)",
  GA4_PROPERTY_ID: "GA4 Property ID",
  GOOGLE_MERCHANT_CENTER_ID: "Merchant Center ID",
};

export function marketingEnvLabel(key: string): string {
  return MARKETING_ENV_LABELS[key] ?? key;
}

export function marketingChannelEnvStatus(envKeys: string[]): {
  configured: boolean;
  items: { key: string; set: boolean }[];
} {
  const items = envKeys.map((key) => ({
    key,
    set: Boolean(process.env[key]?.trim()),
  }));
  return {
    configured: items.length === 0 ? true : items.every((i) => i.set),
    items,
  };
}
