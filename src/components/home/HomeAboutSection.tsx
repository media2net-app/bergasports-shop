import Link from "next/link";

import { HOME_ABOUT } from "@/lib/site-content";

export default function HomeAboutSection() {
  return (
    <section
      className="rounded-2xl border border-[#e5dcc8] bg-white p-6 md:p-8"
      aria-labelledby="home-about-title"
    >
      <h2
        id="home-about-title"
        className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--foreground)]"
      >
        {HOME_ABOUT.title}
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-[var(--foreground)]/85 md:text-base">{HOME_ABOUT.text}</p>
      <p className="mt-6">
        <Link
          href="/despre-noi"
          className="text-sm font-semibold text-[var(--brand-hover)] underline underline-offset-2"
        >
          {HOME_ABOUT.cta} →
        </Link>
      </p>
    </section>
  );
}
