import Link from "next/link";

import { loadLatestNewsPosts } from "@/lib/news-db";

export default async function HomeNewsSection() {
  const posts = await loadLatestNewsPosts(3);
  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-[var(--foreground)] md:text-3xl">
          Laatste nieuws
        </h2>
        <Link
          href="/nieuws"
          className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--foreground)]/70 hover:text-[var(--brand)]"
        >
          Alles
        </Link>
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-[var(--foreground)]/60">Binnenkort meer Bergasports-nieuws.</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/nieuws/${post.slug}`} className="group block">
                {post.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.coverImage}
                    alt=""
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-[16/10] w-full bg-[var(--foreground)]/5" />
                )}
                <p className="mt-3 text-[11px] uppercase tracking-wider text-[var(--foreground)]/50">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : null}
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg group-hover:text-[var(--brand)]">
                  {post.title}
                </h3>
                {post.excerpt ? (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--foreground)]/70">{post.excerpt}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
