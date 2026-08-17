import Link from "next/link";

import { HOME_PILLARS } from "@/lib/site-content";

export default function HomePillarsSection() {
  return (
    <section aria-label="Hoofdcollecties" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {HOME_PILLARS.map((pillar) => (
        <Link
          key={pillar.href}
          href={pillar.href}
          className="card-lift group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white p-6 hover:border-[var(--brand)]/45"
        >
          <span
            className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-mid)] transition-transform duration-500 group-hover:scale-x-100"
            aria-hidden
          />
          <h2 className="font-[family-name:var(--font-heading)] text-xl tracking-tight text-[var(--foreground)] transition-colors group-hover:text-[var(--brand)] md:text-2xl">
            {pillar.title}
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--foreground)]/70">
            {pillar.text}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
            Bekijken
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}
