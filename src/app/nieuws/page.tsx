import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import { loadNewsPosts } from "@/lib/news-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nieuws & inspiratie | Bergasports",
  description: "Nieuws over racefietsen, wielen, LaFuga, tips en evenementen bij Bergasports.",
  alternates: { canonical: "/nieuws" },
};

export default async function NieuwsPage() {
  const posts = await loadNewsPosts({ limit: 40 });
  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <div className="mx-auto w-full max-w-[900px] px-4 py-10 md:py-14">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl">Nieuws & inspiratie</h1>
        <p className="mt-3 text-[var(--foreground)]/70">
          Nieuw binnen, merken, LaFuga, techniek, tips en acties.
        </p>
        <ul className="mt-10 space-y-8">
          {posts.length === 0 ? (
            <li className="text-sm text-[var(--foreground)]/60">Nog geen artikelen — sync WP-posts via admin.</li>
          ) : (
            posts.map((post) => (
              <li key={post.id} className="border-b border-[var(--foreground)]/10 pb-8">
                <Link href={`/nieuws/${post.slug}`} className="group block md:grid md:grid-cols-[240px_1fr] md:gap-6">
                  {post.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImage}
                      alt=""
                      className="mb-4 aspect-[16/10] w-full object-cover md:mb-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="mb-4 aspect-[16/10] bg-[var(--foreground)]/5 md:mb-0" />
                  )}
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[var(--foreground)]/50">
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : null}
                      {post.category ? ` · ${post.category}` : ""}
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-heading)] text-2xl group-hover:text-[var(--brand)]">
                      {post.title}
                    </h2>
                    {post.excerpt ? (
                      <p className="mt-2 text-sm text-[var(--foreground)]/70">{post.excerpt}</p>
                    ) : null}
                    <span className="mt-3 inline-block text-xs font-bold uppercase tracking-wider">Lees meer →</span>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
      <Footer />
    </main>
  );
}
