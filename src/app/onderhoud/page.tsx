import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import CmsPageView from "@/components/site/CmsPageView";
import ContactLeadForm from "@/components/site/ContactLeadForm";
import { buildPageMetadata } from "@/lib/seo";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPageByPath("/onderhoud");
  return buildPageMetadata({
    absoluteTitle: page?.meta_title?.trim() || undefined,
    title: page?.meta_title ? undefined : "Onderhoud & reparatie",
    description:
      page?.meta_description?.trim() ||
      "Onderhoud, afstelling en reparatie van racefietsen, gravel en MTB in onze werkplaats in Dedemsvaart.",
    path: "/onderhoud",
    image: page?.social_image,
    imageAlt: page?.image_alt || page?.title,
    noindex: page?.noindex,
    ogTitle: page?.og_title,
    ogDescription: page?.og_description,
  });
}

const FALLBACK = `
<p><strong>Goed materiaal begint met goed onderhoud.</strong></p>
<p>Wij helpen met onderhoud, afstelling en reparaties aan racefietsen en andere fietsen.</p>
<ul>
<li>Onderhoudsbeurt</li>
<li>Versnellingen afstellen</li>
<li>Remmen</li>
<li>Banden / tubeless</li>
<li>Wielmontage &amp; cassette</li>
<li>Onderdelen vervangen</li>
<li>Diagnose</li>
</ul>
<p>Wil je weten wat jouw fiets nodig heeft? <a href="/afspraak">Maak een afspraak</a>.</p>
`;

export default async function OnderhoudPage() {
  const page = await getPublishedPageByPath("/onderhoud");
  if (page) {
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
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <article className="mx-auto max-w-[760px] px-4 py-12">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl">Onderhoud & reparatie</h1>
        <div className="cms-html mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: FALLBACK }} />
        <Link
          href="/afspraak"
          className="mt-8 inline-flex min-h-11 items-center bg-[var(--topbar)] px-5 text-xs font-bold uppercase tracking-wider text-white"
        >
          Maak een afspraak
        </Link>
      </article>
      <Footer />
    </main>
  );
}
