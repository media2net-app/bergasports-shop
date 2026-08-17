import Link from "next/link";

import { HOME_PILLARS } from "@/lib/site-content";

export default function HomePillarsSection() {
  return (
    <section aria-label="Hoofdcollecties" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {HOME_PILLARS.map((pillar) => (
        <Link
          key={pillar.href}
          href={pillar.href}
          className="group border-b border-[var(--foreground)]/15 pb-4 transition hover:border-[var(--brand)]"
        >
          <h2 className="font-[family-name:var(--font-heading)] text-xl text-[var(--foreground)] group-hover:text-[var(--brand)] md:text-2xl">
            {pillar.title}
          </h2>
          <p className="mt-2 text-sm text-[var(--foreground)]/70">{pillar.text}</p>
        </Link>
      ))}
    </section>
  );
}
