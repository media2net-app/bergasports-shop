import type { Metadata } from "next";
import LocalizedLink from "@/components/locale/LocalizedLink";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import NewsCard from "@/components/news/NewsCard";
import ContentCtaCard from "@/components/site/ContentCtaCard";
import { loadNewsPosts } from "@/lib/news-db";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPageMetadata({
  title: "Nieuws & inspiratie",
  description: "Nieuws over racefietsen, wielen, LaFuga, tips en evenementen bij Bergasports.",
  path: "/nieuws",
});

export default async function NieuwsPage() {
  const posts = await loadNewsPosts({ limit: 40 });
  const [featured, ...rest] = posts;

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <Header />
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:py-12 lg:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              Bergasports · Dedemsvaart
            </p>
            <h1 className="section-rule font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl lg:text-[2.6rem]">
              Nieuws &amp; inspiratie
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--foreground)]/70 md:text-lg">
              Updates uit de winkel, nieuwe producten en wat er speelt in Dedemsvaart.
            </p>

            {posts.length === 0 ? (
              <p className="mt-10 rounded-3xl border border-dashed border-[var(--brand-border)] bg-white px-6 py-12 text-sm leading-relaxed text-[var(--foreground)]/65">
                Nog geen berichten. Zodra er nieuws is — een nieuwe fiets, een pasavond of een wedstrijd —
                staat het hier.
              </p>
            ) : (
              <div className="mt-10 space-y-6">
                {featured ? <NewsCard post={featured} variant="featured" /> : null}
                {rest.length > 0 ? (
                  <ul className="grid gap-5 sm:grid-cols-2">
                    {rest.map((post) => (
                      <li key={post.id}>
                        <NewsCard post={post} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28">
            <ContentCtaCard />
            <p className="px-1 text-sm text-[var(--foreground)]/60">
              Liever meteen kijken?{" "}
              <LocalizedLink href="/shop" className="font-semibold text-[var(--brand)] underline-offset-4 hover:underline">
                Naar de shop
              </LocalizedLink>
              .
            </p>
          </aside>
        </div>
      </div>
      <Footer />
    </main>
  );
}
