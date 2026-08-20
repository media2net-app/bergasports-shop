import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import CmsPageView from "@/components/site/CmsPageView";
import ContactLeadForm from "@/components/site/ContactLeadForm";
import GoogleReviewsCard from "@/components/site/GoogleReviewsCard";
import ShopMapEmbed from "@/components/site/ShopMapEmbed";
import { getRequestLocale } from "@/lib/i18n/locale";
import { localizePageFields } from "@/lib/i18n/localize-page";
import { getSitePageSeedByPath } from "@/lib/legal-site-pages-content";
import { buildPageMetadata, localBusinessJsonLd } from "@/lib/seo";
import { shopPhoneTelHref } from "@/lib/site-contact";
import { PAGE_SEO } from "@/lib/site-content";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import { getShopOpeningHours, getShopPublicContact } from "@/lib/shop-runtime";
import { getGooglePlaceAggregateRating } from "@/lib/google-reviews";
import { getInstagramPublicUrl } from "@/lib/instagram";

export const dynamic = "force-dynamic";

const SEED = getSitePageSeedByPath("/contact");

export async function generateMetadata(): Promise<Metadata> {
  const [page, locale] = await Promise.all([getPublishedPageByPath("/contact"), getRequestLocale()]);
  const localized = page ? localizePageFields(page, locale) : null;
  return buildPageMetadata({
    absoluteTitle: localized?.meta_title?.trim() || PAGE_SEO.contact.title,
    description: localized?.meta_description?.trim() || PAGE_SEO.contact.description,
    path: "/contact",
    image: localized?.social_image || SEED?.social_image,
    imageAlt: localized?.image_alt || SEED?.image_alt || localized?.title,
    noindex: localized?.noindex,
    ogTitle: localized?.og_title,
    ogDescription: localized?.og_description,
  });
}

export default async function ContactPage() {
  const [page, contact, hours, instagramUrl, googleRating, locale] = await Promise.all([
    getPublishedPageByPath("/contact"),
    getShopPublicContact(),
    getShopOpeningHours(),
    getInstagramPublicUrl(),
    getGooglePlaceAggregateRating().catch(() => null),
    getRequestLocale(),
  ]);
  const fallback = SEED
    ? {
        path: "/contact" as const,
        title: SEED.title,
        heading: SEED.heading,
        body_html: SEED.body_html,
        social_image: SEED.social_image ?? null,
        image_alt: SEED.image_alt ?? null,
      }
    : null;
  const source = page ? localizePageFields(page, locale) : fallback;
  if (!source) {
    notFound();
  }

  /* Oudere seeds verwijzen voor het nummer naar de footer; toon het hier direct. */
  const phoneLink = `<a href="${shopPhoneTelHref(contact.phone)}" class="font-semibold underline">${contact.phone}</a>`;
  const bodyWithPhone = source.body_html
    .replace("vezi numarul din footer", phoneLink)
    .replace("zie footer", phoneLink);

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd(hours, instagramUrl, googleRating)) }}
      />
      <Header />
      <CmsPageView
        page={{ ...source, body_html: bodyWithPhone }}
        aside={
          <div className="space-y-6">
            <ContactLeadForm kind="contact" />
            <GoogleReviewsCard />
            <ShopMapEmbed />
          </div>
        }
      />
      <Footer />
    </main>
  );
}
