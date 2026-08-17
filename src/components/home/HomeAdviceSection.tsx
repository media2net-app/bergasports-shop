import Link from "next/link";

import { HOME_ADVICE } from "@/lib/site-content";

export default function HomeAdviceSection() {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-gradient-to-b from-white to-[var(--brand-surface-alt)] px-6 py-12 text-center md:px-10 md:py-16">
      <span
        className="absolute -top-24 left-1/2 h-48 w-[28rem] -translate-x-1/2 rounded-full bg-[var(--brand-mid)]/20 blur-[90px]"
        aria-hidden
      />
      <h2 className="section-rule section-rule-center font-[family-name:var(--font-heading)] text-2xl tracking-tight text-[var(--foreground)] md:text-3xl">
        {HOME_ADVICE.title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[var(--foreground)]/75 md:text-base">
        {HOME_ADVICE.text}
      </p>
      <Link
        href={HOME_ADVICE.ctaHref}
        className="group mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--topbar)] px-7 text-xs font-bold uppercase tracking-[0.14em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
      >
        {HOME_ADVICE.cta}
        <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
          →
        </span>
      </Link>
    </section>
  );
}
