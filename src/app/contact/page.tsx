import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import CmsPageView from "@/components/site/CmsPageView";
import ContactLeadForm from "@/components/site/ContactLeadForm";
import { buildPageMetadata, localBusinessJsonLd } from "@/lib/seo";
import { shopPhoneTelHref } from "@/lib/site-contact";
import { PAGE_SEO } from "@/lib/site-content";
import { getPublishedPageByPath } from "@/lib/site-pages-db";
import { getShopOpeningHours, getShopPublicContact } from "@/lib/shop-runtime";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageByPath("/contact");
  return buildPageMetadata({
    absoluteTitle: page?.meta_title?.trim() || PAGE_SEO.contact.title,
    description: page?.meta_description?.trim() || PAGE_SEO.contact.description,
    path: "/contact",
    image: page?.social_image,
    imageAlt: page?.image_alt || page?.title,
    noindex: page?.noindex,
    ogTitle: page?.og_title,
    ogDescription: page?.og_description,
  });
}

export default async function ContactPage() {
  const [page, contact, hours] = await Promise.all([
    getPublishedPageByPath("/contact"),
    getShopPublicContact(),
    getShopOpeningHours(),
  ]);
  if (!page) {
    notFound();
  }

  /* Oudere seeds verwijzen voor het nummer naar de footer; toon het hier direct. */
  const phoneLink = `<a href="${shopPhoneTelHref(contact.phone)}" class="font-semibold underline">${contact.phone}</a>`;
  const bodyWithPhone = page.body_html
    .replace("vezi numarul din footer", phoneLink)
    .replace("zie footer", phoneLink);

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd(hours)) }}
      />
      <TrustBar />
      <Header />
      <CmsPageView page={{ ...page, body_html: bodyWithPhone }} />
      <div className="mx-auto w-full max-w-[1440px] px-4 pb-12">
        <ContactLeadForm kind="contact" />
      </div>
      <Footer />
    </main>
  );
}
