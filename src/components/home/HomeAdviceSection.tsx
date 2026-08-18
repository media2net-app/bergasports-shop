import Image from "next/image";
import Link from "next/link";

import { CONTENT_PHOTOS } from "@/lib/content-photos";
import { HOME_ADVICE } from "@/lib/site-content";
import { shopPhoneTelHref, whatsappHref } from "@/lib/site-contact";
import { getShopPublicContact } from "@/lib/shop-runtime";

export default async function HomeAdviceSection() {
  const contact = await getShopPublicContact();
  const wa = contact.whatsappHref ?? whatsappHref(contact.phone);
  const photo = CONTENT_PHOTOS.workshopIngmar;

  return (
    <section className="relative isolate grid overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-gradient-to-b from-white to-[var(--brand-surface-alt)] md:grid-cols-2">
      <div className="relative min-h-[240px] md:min-h-[360px]">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center"
        />
      </div>
      <div className="relative px-6 py-10 md:px-10 md:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
          Werkplaats &amp; advies
        </p>
        <h2 className="section-rule mt-2 font-[family-name:var(--font-heading)] text-2xl tracking-tight text-[var(--foreground)] md:text-3xl">
          {HOME_ADVICE.title}
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--foreground)]/75 md:text-base">
          {HOME_ADVICE.text}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={HOME_ADVICE.ctaHref}
            className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--topbar)] px-7 text-xs font-bold uppercase tracking-[0.14em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
          >
            {HOME_ADVICE.cta}
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
          <a
            href={shopPhoneTelHref(contact.phone)}
            className="inline-flex min-h-12 items-center rounded-full border border-[var(--brand-border)] bg-white px-6 text-xs font-bold uppercase tracking-[0.14em] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Bel {contact.phone}
          </a>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center rounded-full border border-[var(--brand-border)] bg-white px-6 text-xs font-bold uppercase tracking-[0.14em] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
