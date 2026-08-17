import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import CmsPageView from "@/components/site/CmsPageView";
import { getPublishedPageByPath } from "@/lib/site-pages-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Onderhoud & reparatie | Bergasports",
  description: "Onderhoud, afstelling en reparaties aan racefietsen en meer in Dedemsvaart.",
  alternates: { canonical: "/onderhoud" },
};

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
<p>Wil je weten wat jouw fiets nodig heeft? <a href="/contact">Maak een afspraak</a>.</p>
`;

export default async function OnderhoudPage() {
  const page = await getPublishedPageByPath("/onderhoud");
  if (page) {
    return (
      <main className="min-h-screen bg-[#faf8f5]/40">
        <TrustBar />
        <Header />
        <CmsPageView page={page} />
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
        <div className="prose prose-neutral mt-6 max-w-none" dangerouslySetInnerHTML={{ __html: FALLBACK }} />
        <Link
          href="/contact"
          className="mt-8 inline-flex min-h-11 items-center bg-[var(--topbar)] px-5 text-xs font-bold uppercase tracking-wider text-white"
        >
          Maak een afspraak
        </Link>
      </article>
      <Footer />
    </main>
  );
}
