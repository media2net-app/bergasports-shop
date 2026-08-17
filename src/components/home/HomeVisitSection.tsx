import Link from "next/link";

import { HOME_VISIT } from "@/lib/site-content";

export default function HomeVisitSection() {
  return (
    <section className="bg-[var(--topbar)] px-6 py-10 text-[var(--topbar-foreground)] md:py-12">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl">{HOME_VISIT.title}</h2>
      <p className="mt-3 text-sm text-[var(--topbar-muted)]">{HOME_VISIT.text}</p>
      <Link
        href={HOME_VISIT.ctaHref}
        className="mt-6 inline-flex min-h-11 items-center bg-[var(--brand-mid)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a]"
      >
        {HOME_VISIT.cta}
      </Link>
    </section>
  );
}
