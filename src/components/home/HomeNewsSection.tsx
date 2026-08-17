import Link from "next/link";

import SectionHeading from "@/components/home/SectionHeading";
import { loadLatestNewsPosts } from "@/lib/news-db";

export default async function HomeNewsSection() {
  const posts = await loadLatestNewsPosts(3);
  return (
    <section>
      <SectionHeading
        eyebrow="Uit de winkel"
        title="Laatste nieuws"
        action={
          <Link
            href="/nieuws"
            className="arrow-link inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--foreground)]/70 transition hover:text-[var(--brand)]"
          >
            Alles bekijken
            <span aria-hidden className="arrow-link-icon">
              →
            </span>
          </Link>
        }
      />
      {posts.length === 0 ? (
        <p className="text-sm text-[var(--foreground)]/60">Binnenkort meer Bergasports-nieuws.</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/nieuws/${post.slug}`}
                className="card-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white hover:border-[var(--brand)]/45"
              >
                <div className="overflow-hidden">
                  {post.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImage}
                      alt=""
                      className="media-zoom aspect-[16/10] w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="aspect-[16/10] w-full bg-[var(--brand-surface-alt)]" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand)]">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : null}
                  </p>
                  <h3 className="mt-1.5 font-[family-name:var(--font-heading)] text-lg leading-snug tracking-tight transition-colors group-hover:text-[var(--brand)]">
                    {post.title}
                  </h3>
                  {post.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--foreground)]/70">
                      {post.excerpt}
                    </p>
                  ) : null}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--foreground)]/60 transition-colors group-hover:text-[var(--brand)]">
                    Lees verder
                    <span
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
