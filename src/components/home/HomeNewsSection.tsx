import LocalizedLink from "@/components/locale/LocalizedLink";

import NewsCard from "@/components/news/NewsCard";
import SectionHeading from "@/components/home/SectionHeading";
import { loadLatestNewsPosts } from "@/lib/news-db";

export default async function HomeNewsSection() {
  const posts = await loadLatestNewsPosts(3);

  return (
    <section>
      <SectionHeading
        eyebrow="Uit de winkel"
        title="Laatste nieuws"
        text="Nieuwe fietsen, Nimbl, wedstrijden en wat er speelt in Dedemsvaart."
        action={
          <LocalizedLink
            href="/nieuws"
            className="arrow-link inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--foreground)]/70 transition hover:text-[var(--brand)]"
          >
            Alles bekijken
            <span aria-hidden className="arrow-link-icon">
              →
            </span>
          </LocalizedLink>
        }
      />
      {posts.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-[var(--brand-border)] bg-white px-6 py-10 text-sm leading-relaxed text-[var(--foreground)]/65">
          Binnenkort meer Bergasports-nieuws. Volg ons ondertussen in de winkel of op Instagram.
        </p>
      ) : (
        <ul className="grid gap-5 md:grid-cols-3">
          {posts.map((post) => (
            <li key={post.id}>
              <NewsCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
