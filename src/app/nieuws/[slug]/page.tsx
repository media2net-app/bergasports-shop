import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import NewsCard from "@/components/news/NewsCard";
import ContentCtaCard from "@/components/site/ContentCtaCard";
import { loadNewsPostBySlug, loadNewsPosts } from "@/lib/news-db";
import { formatNewsDate } from "@/lib/news-format";
import { buildPageMetadata, newsArticleJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadNewsPostBySlug(slug);
  if (!post) return { title: "Nieuws" };
  return buildPageMetadata({
    title: post.seoTitle?.trim() || post.title,
    description:
      post.seoDescription?.trim() ||
      post.excerpt?.trim() ||
      `${post.title} — nieuws van Bergasports in Dedemsvaart.`,
    path: `/nieuws/${post.slug}`,
    image: post.socialImage || post.coverImage,
    imageAlt: post.imageAlt || post.title,
    type: "article",
    publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    noindex: post.noindex,
    ogTitle: post.ogTitle,
    ogDescription: post.ogDescription,
  });
}

export default async function NieuwsArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await loadNewsPostBySlug(slug);
  if (!post) notFound();
  const related = (await loadNewsPosts({ limit: 6 })).filter((p) => p.id !== post.id).slice(0, 3);
  const date = formatNewsDate(post.publishedAt);
  const meta = [date, post.category].filter(Boolean).join(" · ");

  return (
    <main className="min-h-screen bg-[#faf8f5]/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd(post)) }}
      />
      <TrustBar />
      <Header />
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 md:py-12 lg:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
          <article className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
              <Link href="/nieuws" className="transition hover:text-[var(--foreground)]">
                Nieuws
              </Link>
              {meta ? ` · ${meta}` : ""}
            </p>
            <h1 className="section-rule mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl lg:text-[2.6rem]">
              {post.title}
            </h1>
            {post.excerpt ? (
              <p className="mt-5 max-w-[720px] text-lg leading-relaxed text-[var(--foreground)]/75">
                {post.excerpt}
              </p>
            ) : null}
            {post.coverImage ? (
              <figure className="mt-8 overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-surface-alt)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImage}
                  alt={post.imageAlt || post.title}
                  className="max-h-[min(70vh,540px)] w-full object-cover object-center"
                />
              </figure>
            ) : null}
            <div
              className="cms-html cms-page-body mt-8 max-w-[720px] text-[var(--foreground)]/85"
              dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
            />
          </article>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <ContentCtaCard />
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-14 border-t border-[var(--brand-border)] pt-12">
            <h2 className="section-rule font-[family-name:var(--font-heading)] text-2xl tracking-tight md:text-3xl">
              Meer nieuws
            </h2>
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <NewsCard post={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <Footer />
    </main>
  );
}
