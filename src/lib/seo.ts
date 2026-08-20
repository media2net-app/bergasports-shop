import type { Metadata } from "next";

import {
  HOME_HERO_IMAGE_SRC,
  SITE_BRAND_NAME,
  SITE_DEFAULT_URL,
  SITE_EMAIL,
  SITE_LOGO_SRC,
} from "@/lib/site-brand";
import { shopPhoneTelHref } from "@/lib/site-contact";
import {
  INSTAGRAM_URL,
  SHOP_GEO,
  SHOP_MAPS_URL,
  SITE_KVK,
  type OpeningHoursRow,
} from "@/lib/site-content";
import { periodsForOpeningHoursRow } from "@/lib/opening-hours";

/** Fallback-afbeelding voor Open Graph / Twitter wanneer een pagina geen eigen beeld heeft. */
export const DEFAULT_OG_IMAGE = {
  url: HOME_HERO_IMAGE_SRC,
  width: 1024,
  height: 576,
  alt: `${SITE_BRAND_NAME} in Dedemsvaart`,
};

export function siteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (env || SITE_DEFAULT_URL).replace(/\/$/, "");
}

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

type PageMetadataInput = {
  /** Volledige titel zoals de beheerder hem invult; overslaat de `%s | Bergasports`-template. */
  absoluteTitle?: string;
  /** Titel die de template mag aanvullen. */
  title?: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  noindex?: boolean;
  ogTitle?: string | null;
  ogDescription?: string | null;
  type?: "website" | "article";
  publishedTime?: string;
};

/**
 * Eén opbouw voor title, description, canonical, Open Graph en Twitter-card.
 * Zo krijgt elke route dezelfde velden en blijft de suffix consistent.
 */
export function buildPageMetadata({
  absoluteTitle,
  title,
  description,
  path,
  image,
  imageAlt,
  noindex = false,
  ogTitle,
  ogDescription,
  type = "website",
  publishedTime,
}: PageMetadataInput): Metadata {
  const canonical = path;
  const ogImage = image?.trim()
    ? { url: image, alt: imageAlt ?? absoluteTitle ?? title ?? SITE_BRAND_NAME }
    : DEFAULT_OG_IMAGE;
  const socialTitle =
    ogTitle?.trim() || absoluteTitle || (title ? `${title} | ${SITE_BRAND_NAME}` : SITE_BRAND_NAME);
  const socialDescription = ogDescription?.trim() || description;

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    alternates: { canonical },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      siteName: SITE_BRAND_NAME,
      locale: "nl_NL",
      title: socialTitle,
      description: socialDescription,
      /* Relatief laten: Next lost dit op tegen metadataBase, gelijk aan de canonical. */
      url: canonical,
      images: [ogImage],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: [ogImage.url],
    },
  };
}

const STORE_ID = `${SITE_DEFAULT_URL}/#store`;
const ORGANIZATION_ID = `${SITE_DEFAULT_URL}/#organization`;

function openingHoursSpecification(hours: OpeningHoursRow[]) {
  return hours.flatMap((row) =>
    periodsForOpeningHoursRow(row).map((period) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${row.schemaDay}`,
      opens: period.opens,
      closes: period.closes,
    })),
  );
}

export type LocalBusinessRating = {
  ratingValue: number;
  reviewCount: number;
};

/** SportingGoodsStore: fysieke winkel met adres, telefoon en openingstijden. */
export function localBusinessJsonLd(
  hours: OpeningHoursRow[] = [],
  instagramUrl = INSTAGRAM_URL,
  rating?: LocalBusinessRating | null,
) {
  return {
    "@context": "https://schema.org",
    "@type": "SportingGoodsStore",
    "@id": STORE_ID,
    name: SITE_BRAND_NAME,
    url: siteOrigin(),
    image: absoluteUrl(HOME_HERO_IMAGE_SRC),
    logo: absoluteUrl(SITE_LOGO_SRC),
    email: SITE_EMAIL,
    telephone: shopPhoneTelHref().replace("tel:", ""),
    priceRange: "€€–€€€€",
    currenciesAccepted: "EUR",
    paymentAccepted: "iDEAL, Apple Pay, Google Pay, Visa, Mastercard, Bancontact",
    identifier: { "@type": "PropertyValue", name: "KvK", value: SITE_KVK },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Julianastraat 3A",
      postalCode: "7701 GH",
      addressLocality: "Dedemsvaart",
      addressCountry: "NL",
    },
    hasMap: SHOP_MAPS_URL,
    geo: {
      "@type": "GeoCoordinates",
      latitude: SHOP_GEO.latitude,
      longitude: SHOP_GEO.longitude,
    },
    openingHoursSpecification: openingHoursSpecification(hours),
    sameAs: [instagramUrl],
    areaServed: ["NL", "BE"],
    ...(rating && rating.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.ratingValue,
            reviewCount: rating.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

type NewsArticleInput = {
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: string | null;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

export function newsArticleJsonLd(post: NewsArticleInput) {
  const url = absoluteUrl(`/nieuws/${post.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt || undefined,
    image: [absoluteUrl(post.coverImage?.trim() || HOME_HERO_IMAGE_SRC)],
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "nl-NL",
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    dateModified: post.updatedAt
      ? new Date(post.updatedAt).toISOString()
      : post.publishedAt
        ? new Date(post.publishedAt).toISOString()
        : undefined,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function organizationJsonLd(instagramUrl = INSTAGRAM_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_BRAND_NAME,
    url: siteOrigin(),
    logo: absoluteUrl(SITE_LOGO_SRC),
    email: SITE_EMAIL,
    sameAs: [instagramUrl],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: shopPhoneTelHref().replace("tel:", ""),
        email: SITE_EMAIL,
        availableLanguage: ["nl", "en"],
      },
    ],
  };
}

/** WebSite + SearchAction zodat Google de interne zoekfunctie kent. */
export function websiteJsonLd() {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_DEFAULT_URL}/#website`,
    url: origin,
    name: SITE_BRAND_NAME,
    inLanguage: "nl-NL",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
