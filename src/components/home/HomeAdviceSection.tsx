import Link from "next/link";

import { HOME_ADVICE } from "@/lib/site-content";

export default function HomeAdviceSection() {
  return (
    <section className="border-y border-[var(--foreground)]/10 py-10 text-center md:py-14">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl text-[var(--foreground)] md:text-3xl">
        {HOME_ADVICE.title}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--foreground)]/75 md:text-base">{HOME_ADVICE.text}</p>
      <Link
        href={HOME_ADVICE.ctaHref}
        className="mt-6 inline-flex min-h-11 items-center justify-center bg-[var(--topbar)] px-6 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:opacity-90"
      >
        {HOME_ADVICE.cta}
      </Link>
    </section>
  );
}
