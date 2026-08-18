import Link from "next/link";

import SectionHeading from "@/components/home/SectionHeading";
import { HOME_BRAND_LIST, HOME_BRANDS } from "@/lib/site-content";

export default function HomeBrandsSection() {
  return (
    <section>
      <SectionHeading
        align="center"
        eyebrow="Merken die we vertrouwen"
        title="Onze merken"
        text={HOME_BRANDS}
      />
      <div className="gold-divider mx-auto max-w-md" aria-hidden>
        <span />
      </div>
      <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
        {HOME_BRAND_LIST.map((brand) => (
          <li key={brand}>
            <span className="inline-flex min-h-10 items-center rounded-full border border-[var(--brand-border)] bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]/80">
              {brand}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center">
        <Link
          href="/merken"
          className="arrow-link inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand)]"
        >
          Meer over onze merken
          <span aria-hidden className="arrow-link-icon">
            →
          </span>
        </Link>
      </p>
    </section>
  );
}
