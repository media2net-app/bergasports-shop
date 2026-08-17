import Link from "next/link";

import { HOME_ABOUT } from "@/lib/site-content";

export default function HomeAboutTeaser() {
  return (
    <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
      <div>
        <h2 className="section-rule font-[family-name:var(--font-heading)] text-2xl tracking-tight text-[var(--foreground)] md:text-3xl">
          {HOME_ABOUT.title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--foreground)]/75 md:text-base">
          {HOME_ABOUT.text}
        </p>
      </div>
      <div className="md:text-right">
        <Link
          href={HOME_ABOUT.ctaHref}
          className="arrow-link inline-flex min-h-11 items-center gap-2 border-b border-[var(--foreground)] text-xs font-bold uppercase tracking-[0.14em] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          {HOME_ABOUT.cta}
          <span aria-hidden className="arrow-link-icon">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
