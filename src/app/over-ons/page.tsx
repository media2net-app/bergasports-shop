import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { buildPageMetadata } from "@/lib/seo";
import { getSitePageSeedByPath } from "@/lib/legal-site-pages-content";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import { getRequestLocale } from "@/lib/i18n/locale";
import { localizePageFields } from "@/lib/i18n/localize-page";
import CmsPageView from "@/components/site/CmsPageView";

export const dynamic = "force-dynamic";

const SEED = getSitePageSeedByPath("/over-ons");

export async function generateMetadata(): Promise<Metadata> {
  const [page, locale] = await Promise.all([getPublishedPageByPath("/over-ons"), getRequestLocale()]);
  const localized = page ? localizePageFields(page, locale) : null;
  return buildPageMetadata({
    absoluteTitle:
      localized?.meta_title?.trim() ||
      SEED?.meta_title ||
      "Mijn verhaal | Ingmar Berga — Bergasports Dedemsvaart",
    description:
      localized?.meta_description?.trim() ||
      SEED?.meta_description ||
      "Van topsport naar Bergasports. Het verhaal van Ingmar Berga: persoonlijk advies, hoogwaardig materiaal en jarenlange ervaring in Dedemsvaart.",
    path: "/over-ons",
    image: localized?.social_image || SEED?.social_image,
    imageAlt: localized?.image_alt || SEED?.image_alt || localized?.title,
    noindex: localized?.noindex,
    ogTitle: localized?.og_title,
    ogDescription: localized?.og_description,
  });
}

export default async function OverOnsPage() {
  const [page, locale] = await Promise.all([getPublishedPageByPath("/over-ons"), getRequestLocale()]);
  const view = localizePageFields(
    page ?? {
      path: "/over-ons",
      title: SEED?.title ?? "Mijn verhaal",
      heading: SEED?.heading ?? "Mijn verhaal",
      body_html: SEED?.body_html ?? "",
      social_image: SEED?.social_image ?? null,
      image_alt: SEED?.image_alt ?? null,
    },
    locale,
  );

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <CmsPageView page={view} />
      <Footer />
    </main>
  );
}
