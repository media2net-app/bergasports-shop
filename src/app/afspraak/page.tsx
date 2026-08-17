import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import CmsPageView from "@/components/site/CmsPageView";
import ContactLeadForm from "@/components/site/ContactLeadForm";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageByPath("/afspraak");
  return buildPageMetadata({
    absoluteTitle: page?.meta_title?.trim() || undefined,
    title: page?.meta_title ? undefined : page?.title || "Maak een afspraak",
    description: page?.meta_description?.trim() || "Plan een afspraak bij Bergasports in Dedemsvaart.",
    path: "/afspraak",
    image: page?.social_image,
    imageAlt: page?.image_alt || page?.title,
    noindex: page?.noindex,
    ogTitle: page?.og_title,
    ogDescription: page?.og_description,
  });
}

export default async function AfspraakPage() {
  const page = await getPublishedPageByPath("/afspraak");
  if (!page) notFound();
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <CmsPageView page={page} />
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-12">
        <ContactLeadForm kind="appointment" />
      </div>
      <Footer />
    </main>
  );
}
