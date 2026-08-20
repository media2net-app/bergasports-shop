import Image from "next/image";
import Link from "next/link";

import { CONTENT_PHOTOS } from "@/lib/content-photos";
import { getRequestLocale } from "@/lib/i18n/locale";
import { localizedHomeAbout } from "@/lib/i18n/ui";

export default async function HomeAboutTeaser() {
  const locale = await getRequestLocale();
  const about = localizedHomeAbout(locale);
  const photo = CONTENT_PHOTOS.ingmarNimbl;

  return (
    <section className="grid items-center gap-8 overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-white md:grid-cols-[0.9fr_1.1fr] md:gap-10">
      <div className="relative aspect-[4/5] min-h-[280px] overflow-hidden bg-[var(--brand-surface-alt)] md:aspect-auto md:min-h-[420px]">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 768px) 100vw, 42vw"
          className="object-cover object-center"
        />
      </div>
      <div className="px-6 pb-8 md:py-10 md:pr-10 md:pl-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
          Ingmar Berga
        </p>
        <h2 className="section-rule mt-2 font-[family-name:var(--font-heading)] text-2xl tracking-tight text-[var(--foreground)] md:text-3xl">
          {about.title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--foreground)]/75 md:text-base">
          {about.text}
        </p>
        <Link
          href={about.ctaHref}
          className="arrow-link mt-6 inline-flex min-h-11 items-center gap-2 border-b border-[var(--foreground)] text-xs font-bold uppercase tracking-[0.14em] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          {about.cta}
          <span aria-hidden className="arrow-link-icon">
            →
          </span>
        </Link>
      </div>
    </section>
  );
}
