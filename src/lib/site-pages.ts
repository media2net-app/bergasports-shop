export type HomepageBlocks = {
  hero?: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    ctaShop?: string;
    ctaOffers?: string;
    promoLabel?: string;
    promoTitle?: string;
    promoText?: string;
  };
};

export type SitePageRow = {
  id: number;
  slug: string;
  path: string;
  title: string;
  heading: string | null;
  body_html: string;
  blocks: HomepageBlocks | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  sort_order: number;
  updated_at: string;
};

export type SitePageUpdateInput = {
  title: string;
  heading?: string | null;
  body_html?: string;
  blocks?: HomepageBlocks | null;
  meta_title?: string | null;
  meta_description?: string | null;
  is_published?: boolean;
};

export const DEFAULT_HOMEPAGE_BLOCKS: HomepageBlocks = {
  hero: {
    eyebrow: "Bergasports · Dedemsvaart",
    title: "Meer dan een winkel,\nje sportpartner.",
    subtitle: "Bij Bergasports draait alles om prestaties, kwaliteit en persoonlijke service.",
    ctaShop: "Bekijk onze producten",
    ctaOffers: "Mijn verhaal",
  },
};
