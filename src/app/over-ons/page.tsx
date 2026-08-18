import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import { buildPageMetadata } from "@/lib/seo";
import { getSitePageSeedByPath } from "@/lib/legal-site-pages-content";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import CmsPageView from "@/components/site/CmsPageView";

export const dynamic = "force-dynamic";

const SEED = getSitePageSeedByPath("/over-ons");

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageByPath("/over-ons");
  return buildPageMetadata({
    absoluteTitle:
      page?.meta_title?.trim() ||
      SEED?.meta_title ||
      "Mijn verhaal | Ingmar Berga — Bergasports Dedemsvaart",
    description:
      page?.meta_description?.trim() ||
      SEED?.meta_description ||
      "Van topsport naar Bergasports. Het verhaal van Ingmar Berga: persoonlijk advies, hoogwaardig materiaal en jarenlange ervaring in Dedemsvaart.",
    path: "/over-ons",
    image: page?.social_image || SEED?.social_image,
    imageAlt: page?.image_alt || SEED?.image_alt || page?.title,
    noindex: page?.noindex,
    ogTitle: page?.og_title,
    ogDescription: page?.og_description,
  });
}

export default async function OverOnsPage() {
  const page = await getPublishedPageByPath("/over-ons");
  const view = page ?? {
    path: "/over-ons",
    title: SEED?.title ?? "Mijn verhaal",
    heading: SEED?.heading ?? "Mijn verhaal",
    body_html: SEED?.body_html ?? "",
    social_image: SEED?.social_image ?? null,
    image_alt: SEED?.image_alt ?? null,
  };

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <CmsPageView page={view} />
      <Footer />
    </main>
  );
}
