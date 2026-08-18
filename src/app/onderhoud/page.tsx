import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import CmsPageView from "@/components/site/CmsPageView";
import ContactLeadForm from "@/components/site/ContactLeadForm";
import { getSitePageSeedByPath } from "@/lib/legal-site-pages-content";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import { getShopOpeningHours } from "@/lib/shop-runtime";

export const dynamic = "force-dynamic";

const SEED = getSitePageSeedByPath("/onderhoud");

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageByPath("/onderhoud");
  return buildPageMetadata({
    absoluteTitle: page?.meta_title?.trim() || SEED?.meta_title || undefined,
    title: page?.meta_title || SEED?.meta_title ? undefined : "Onderhoud & reparatie",
    description:
      page?.meta_description?.trim() ||
      SEED?.meta_description ||
      "Onderhoud, afstelling en reparatie van racefietsen, gravel en MTB in onze werkplaats in Dedemsvaart.",
    path: "/onderhoud",
    image: page?.social_image || SEED?.social_image,
    imageAlt: page?.image_alt || SEED?.image_alt || page?.title,
    noindex: page?.noindex,
    ogTitle: page?.og_title,
    ogDescription: page?.og_description,
  });
}

export default async function OnderhoudPage() {
  const [page, hours] = await Promise.all([getPublishedPageByPath("/onderhoud"), getShopOpeningHours()]);
  const view = page ?? {
    path: "/onderhoud",
    title: SEED?.title ?? "Onderhoud & reparatie",
    heading: SEED?.heading ?? "Onderhoud & reparatie",
    body_html: SEED?.body_html ?? "",
    social_image: SEED?.social_image ?? null,
    image_alt: SEED?.image_alt ?? null,
  };

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <CmsPageView page={view} aside={<ContactLeadForm kind="appointment" hours={hours} />} />
      <Footer />
    </main>
  );
}
