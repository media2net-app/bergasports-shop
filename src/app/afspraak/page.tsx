import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import AppointmentPageView from "@/components/site/AppointmentPageView";
import { getSitePageSeedByPath } from "@/lib/legal-site-pages-content";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

const SEED = getSitePageSeedByPath("/afspraak");

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageByPath("/afspraak");
  return buildPageMetadata({
    absoluteTitle: page?.meta_title?.trim() || SEED?.meta_title || undefined,
    title: page?.meta_title || SEED?.title ? undefined : page?.title || "Maak een afspraak",
    description:
      page?.meta_description?.trim() ||
      SEED?.meta_description ||
      "Plan een afspraak bij Bergasports in Dedemsvaart.",
    path: "/afspraak",
    image: page?.social_image || SEED?.social_image,
    imageAlt: page?.image_alt || SEED?.image_alt || page?.title,
    noindex: page?.noindex,
    ogTitle: page?.og_title,
    ogDescription: page?.og_description,
  });
}

export default async function AfspraakPage() {
  const page = await getPublishedPageByPath("/afspraak");
  const view = page ?? {
    path: "/afspraak",
    title: SEED?.title ?? "Maak een afspraak",
    heading: SEED?.heading ?? "Maak een afspraak",
    body_html: SEED?.body_html ?? "",
    social_image: SEED?.social_image ?? null,
    image_alt: SEED?.image_alt ?? null,
  };
  if (!page && !SEED) notFound();

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <AppointmentPageView page={view} />
      <Footer />
    </main>
  );
}
