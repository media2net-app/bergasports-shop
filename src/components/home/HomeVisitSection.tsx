import Image from "next/image";
import Link from "next/link";

import { CONTENT_PHOTOS } from "@/lib/content-photos";
import { shopPhoneTelHref, whatsappHref } from "@/lib/site-contact";
import { HOME_VISIT, SHOP_MAPS_URL } from "@/lib/site-content";
import { getShopOpeningHours, getShopPublicContact } from "@/lib/shop-runtime";

export default async function HomeVisitSection() {
  const [contact, hours] = await Promise.all([getShopPublicContact(), getShopOpeningHours()]);
  const wa = contact.whatsappHref ?? whatsappHref(contact.phone);
  const photo = CONTENT_PHOTOS.storefront;

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-[var(--topbar)] px-6 py-12 text-[var(--topbar-foreground)] md:px-10 md:py-14">
      <span
        className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[var(--brand)]/30 blur-[100px]"
        aria-hidden
      />
      <span
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand-mid)]/60 to-transparent"
        aria-hidden
      />
      <div className="relative grid gap-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <h2 className="section-rule font-[family-name:var(--font-heading)] text-2xl tracking-tight md:text-3xl">
            {HOME_VISIT.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--topbar-muted)] md:text-base">
            {HOME_VISIT.text}
          </p>

          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-mid)]">
                Adres
              </dt>
              <dd className="mt-1">
                <a
                  href={SHOP_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 transition-colors hover:text-[var(--brand-mid)] hover:underline"
                >
                  {contact.address}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-mid)]">
                Telefoon
              </dt>
              <dd className="mt-1">
                <a
                  href={shopPhoneTelHref(contact.phone)}
                  className="underline-offset-4 transition-colors hover:text-[var(--brand-mid)] hover:underline"
                >
                  {contact.phone}
                </a>
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/afspraak#formulier"
              className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--brand-mid)] px-7 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a] transition duration-300 hover:bg-[#f2d680]"
            >
              Plan afspraak
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
            <Link
              href={HOME_VISIT.ctaHref}
              className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-7 text-xs font-bold uppercase tracking-[0.14em] transition duration-300 hover:border-[var(--brand-mid)] hover:text-[var(--brand-mid)]"
            >
              {HOME_VISIT.cta}
            </Link>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-7 text-xs font-bold uppercase tracking-[0.14em] transition duration-300 hover:border-[var(--brand-mid)] hover:text-[var(--brand-mid)]"
              >
                WhatsApp
              </a>
            ) : null}
            <a
              href={SHOP_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center rounded-full border border-white/25 px-7 text-xs font-bold uppercase tracking-[0.14em] transition duration-300 hover:border-[var(--brand-mid)] hover:text-[var(--brand-mid)]"
            >
              Plan je route
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-center"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-mid)]">
              Openingstijden
            </p>
            <dl className="mt-4 divide-y divide-white/10 text-sm">
              {hours.map((row) => {
                const closed = row.hours === "Gesloten";
                return (
                  <div key={row.day} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className={closed ? "text-[var(--topbar-muted)]/70" : "text-[var(--topbar-muted)]"}>
                      {row.day}
                    </dt>
                    <dd
                      className={
                        closed
                          ? "text-[var(--topbar-muted)]/70"
                          : "font-semibold text-[var(--topbar-foreground)]"
                      }
                    >
                      {row.hours}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
