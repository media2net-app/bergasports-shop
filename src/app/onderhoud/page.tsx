import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import CmsPageView from "@/components/site/CmsPageView";
import ContactLeadForm from "@/components/site/ContactLeadForm";
import { getRequestLocale } from "@/lib/i18n/locale";
import { localizePageFields } from "@/lib/i18n/localize-page";
import { getSitePageSeedByPath } from "@/lib/legal-site-pages-content";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import { getShopOpeningHours } from "@/lib/shop-runtime";

export const dynamic = "force-dynamic";

const SEED = getSitePageSeedByPath("/onderhoud");

export async function generateMetadata(): Promise<Metadata> {
  const [page, locale] = await Promise.all([getPublishedPageByPath("/onderhoud"), getRequestLocale()]);
  const localized = page ? localizePageFields(page, locale) : null;
  return buildPageMetadata({
    absoluteTitle: localized?.meta_title?.trim() || SEED?.meta_title || undefined,
    title: localized?.meta_title || SEED?.meta_title ? undefined : "Onderhoud & reparatie",
    description:
      localized?.meta_description?.trim() ||
      SEED?.meta_description ||
      "Onderhoud, afstelling en reparatie van racefietsen, gravel en MTB in onze werkplaats in Dedemsvaart.",
    path: "/onderhoud",
    image: localized?.social_image || SEED?.social_image,
    imageAlt: localized?.image_alt || SEED?.image_alt || localized?.title,
    noindex: localized?.noindex,
    ogTitle: localized?.og_title,
    ogDescription: localized?.og_description,
  });
}

export default async function OnderhoudPage() {
  const [page, hours, locale] = await Promise.all([
    getPublishedPageByPath("/onderhoud"),
    getShopOpeningHours(),
    getRequestLocale(),
  ]);
  const view = localizePageFields(
    page ?? {
      path: "/onderhoud",
      title: SEED?.title ?? "Onderhoud & reparatie",
      heading: SEED?.heading ?? "Onderhoud & reparatie",
      body_html: SEED?.body_html ?? "",
      social_image: SEED?.social_image ?? null,
      image_alt: SEED?.image_alt ?? null,
    },
    locale,
  );

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <CmsPageView page={view} aside={<ContactLeadForm kind="appointment" hours={hours} />} />
      <Footer />
    </main>
  );
}
