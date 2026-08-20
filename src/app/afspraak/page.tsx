import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import AppointmentPageView from "@/components/site/AppointmentPageView";
import { getRequestLocale } from "@/lib/i18n/locale";
import { localizePageFields } from "@/lib/i18n/localize-page";
import { getSitePageSeedByPath } from "@/lib/legal-site-pages-content";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

const SEED = getSitePageSeedByPath("/afspraak");

export async function generateMetadata(): Promise<Metadata> {
  const [page, locale] = await Promise.all([getPublishedPageByPath("/afspraak"), getRequestLocale()]);
  const localized = page ? localizePageFields(page, locale) : null;
  return buildPageMetadata({
    absoluteTitle: localized?.meta_title?.trim() || SEED?.meta_title || undefined,
    title: localized?.meta_title || SEED?.title ? undefined : localized?.title || "Maak een afspraak",
    description:
      localized?.meta_description?.trim() ||
      SEED?.meta_description ||
      "Plan een afspraak bij Bergasports in Dedemsvaart.",
    path: "/afspraak",
    image: localized?.social_image || SEED?.social_image,
    imageAlt: localized?.image_alt || SEED?.image_alt || localized?.title,
    noindex: localized?.noindex,
    ogTitle: localized?.og_title,
    ogDescription: localized?.og_description,
  });
}

export default async function AfspraakPage() {
  const [page, locale] = await Promise.all([getPublishedPageByPath("/afspraak"), getRequestLocale()]);
  const view = localizePageFields(
    page ?? {
      path: "/afspraak",
      title: SEED?.title ?? "Maak een afspraak",
      heading: SEED?.heading ?? "Maak een afspraak",
      body_html: SEED?.body_html ?? "",
      social_image: SEED?.social_image ?? null,
      image_alt: SEED?.image_alt ?? null,
    },
    locale,
  );
  if (!page && !SEED) notFound();

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <AppointmentPageView page={view} />
      <Footer />
    </main>
  );
}
