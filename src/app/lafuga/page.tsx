import type { Metadata } from "next";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import CmsPageView from "@/components/site/CmsPageView";
import ContactLeadForm from "@/components/site/ContactLeadForm";
import { getSitePageSeedByPath } from "@/lib/legal-site-pages-content";
import { LAFUGA_HEADING, LAFUGA_META_DESCRIPTION } from "@/lib/lafuga-copy";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import { getShopOpeningHours } from "@/lib/shop-runtime";

export const dynamic = "force-dynamic";

const SEED = getSitePageSeedByPath("/lafuga");

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageByPath("/lafuga");
  return buildPageMetadata({
    absoluteTitle: page?.meta_title?.trim() || SEED?.meta_title || undefined,
    title: page?.meta_title || SEED?.meta_title ? undefined : LAFUGA_HEADING,
    description: page?.meta_description?.trim() || SEED?.meta_description || LAFUGA_META_DESCRIPTION,
    path: "/lafuga",
    image: page?.social_image || SEED?.social_image,
    imageAlt: page?.image_alt || SEED?.image_alt || page?.title,
    noindex: page?.noindex,
    ogTitle: page?.og_title,
    ogDescription: page?.og_description,
  });
}

export default async function LafugaPage() {
  const [page, hours] = await Promise.all([getPublishedPageByPath("/lafuga"), getShopOpeningHours()]);
  const view = {
    path: "/lafuga",
    title: SEED?.title ?? page?.title ?? LAFUGA_HEADING,
    heading: SEED?.heading ?? page?.heading ?? LAFUGA_HEADING,
    body_html: SEED?.body_html ?? page?.body_html ?? "",
    social_image: page?.social_image ?? SEED?.social_image ?? null,
    image_alt: page?.image_alt ?? SEED?.image_alt ?? null,
  };

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <CmsPageView
        page={view}
        aside={
          <div id="maatwerk-aanvraag">
            <ContactLeadForm kind="lafuga" hours={hours} />
          </div>
        }
      />
      <Footer />
    </main>
  );
}
