import Link from "next/link";

import { HOME_INTRO } from "@/lib/site-content";

export default function HomeIntroSection() {
  return (
    <section className="w-full" aria-labelledby="home-intro-title">
      <h2
        id="home-intro-title"
        className="font-[family-name:var(--font-heading)] text-2xl font-semibold leading-snug text-[var(--foreground)] md:text-3xl"
      >
        {HOME_INTRO.title}
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--foreground)]/80 md:text-base">
        {HOME_INTRO.lead}
      </p>
      <p className="mt-6">
        <Link
          href="/shop"
          className="inline-flex rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)]"
        >
          {HOME_INTRO.cta} →
        </Link>
      </p>
    </section>
  );
}
