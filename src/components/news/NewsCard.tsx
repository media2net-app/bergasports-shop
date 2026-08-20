"use client";

import LocalizedLink from "@/components/locale/LocalizedLink";

import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { formatNewsCategory, formatNewsDate, type NewsCardPost } from "@/lib/news-format";
import { ui } from "@/lib/i18n/ui";

type NewsCardProps = {
  post: NewsCardPost;
  variant?: "card" | "featured";
};

export default function NewsCard({ post, variant = "card" }: NewsCardProps) {
  const { locale } = useShopLocale();
  const t = ui(locale);
  const date = formatNewsDate(post.publishedAt, locale);
  const featured = variant === "featured";
  const meta = [date, formatNewsCategory(post.category)].filter(Boolean).join(" · ");

  return (
    <LocalizedLink
      href={`/nieuws/${post.slug}`}
      className={`card-lift group flex h-full overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-white hover:border-[var(--brand)]/45 ${
        featured ? "flex-col md:grid md:grid-cols-[1.15fr_0.85fr] md:items-stretch" : "flex-col"
      }`}
    >
      <div className={`relative overflow-hidden bg-[var(--brand-surface-alt)] ${featured ? "md:min-h-[320px]" : ""}`}>
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.imageAlt || ""}
            className={`media-zoom w-full object-cover ${featured ? "aspect-[16/10] h-full md:aspect-auto md:min-h-[320px]" : "aspect-[16/10]"}`}
            loading={featured ? "eager" : "lazy"}
          />
        ) : (
          <div className={`w-full bg-[var(--brand-surface-alt)] ${featured ? "aspect-[16/10] md:min-h-[320px]" : "aspect-[16/10]"}`} />
        )}
      </div>
      <div className={`flex flex-1 flex-col ${featured ? "p-6 md:justify-center md:p-10" : "p-5"}`}>
        {meta ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">{meta}</p>
        ) : null}
        {featured ? (
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl leading-snug tracking-tight transition-colors group-hover:text-[var(--brand)] md:text-3xl">
            {post.title}
          </h2>
        ) : (
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-lg leading-snug tracking-tight transition-colors group-hover:text-[var(--brand)]">
            {post.title}
          </h3>
        )}
        {post.excerpt ? (
          <p
            className={`mt-2 leading-relaxed text-[var(--foreground)]/70 ${
              featured ? "line-clamp-3 text-sm md:text-base" : "line-clamp-2 text-sm"
            }`}
          >
            {post.excerpt}
          </p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--foreground)]/60 transition-colors group-hover:text-[var(--brand)]">
          {t.readMore}
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </LocalizedLink>
  );
}
