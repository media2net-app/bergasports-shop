import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import { loadNewsPostBySlug, loadNewsPosts } from "@/lib/news-db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadNewsPostBySlug(slug);
  if (!post) return { title: "Nieuws" };
  return {
    title: `${post.title} | Bergasports`,
    description: post.excerpt || undefined,
    alternates: { canonical: `/nieuws/${post.slug}` },
  };
}

export default async function NieuwsArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await loadNewsPostBySlug(slug);
  if (!post) notFound();
  const related = (await loadNewsPosts({ limit: 4 })).filter((p) => p.id !== post.id).slice(0, 3);

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <TrustBar />
      <Header />
      <article className="mx-auto w-full max-w-[760px] px-4 py-10 md:py-14">
        <p className="text-[11px] uppercase tracking-wider text-[var(--foreground)]/50">
          <Link href="/nieuws" className="hover:underline">
            Nieuws
          </Link>
          {post.publishedAt
            ? ` · ${new Date(post.publishedAt).toLocaleDateString("nl-NL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}`
            : ""}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl md:text-4xl">{post.title}</h1>
        {post.excerpt ? <p className="mt-4 text-lg text-[var(--foreground)]/75">{post.excerpt}</p> : null}
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImage} alt="" className="mt-8 w-full object-cover" />
        ) : null}
        <div
          className="prose prose-neutral mt-8 max-w-none text-[var(--foreground)]/85"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      </article>
      {related.length > 0 ? (
        <section className="mx-auto w-full max-w-[760px] px-4 pb-14">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl">Gerelateerde artikelen</h2>
          <ul className="mt-4 space-y-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/nieuws/${r.slug}`} className="text-[var(--brand)] hover:underline">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <Footer />
    </main>
  );
}
