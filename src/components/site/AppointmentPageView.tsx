import ContactLeadForm from "@/components/site/ContactLeadForm";
import { getRequestLocale } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import { shopPhoneTelHref, whatsappHref } from "@/lib/site-contact";
import { getShopOpeningHours, getShopPublicContact } from "@/lib/shop-runtime";
import type { CmsPageViewPage } from "@/components/site/CmsPageView";

type Props = {
  page: CmsPageViewPage;
};

export default async function AppointmentPageView({ page }: Props) {
  const [contact, hours, locale] = await Promise.all([
    getShopPublicContact(),
    getShopOpeningHours(),
    getRequestLocale(),
  ]);
  const t = ui(locale);
  const heading = page.heading?.trim() || page.title;
  const hero = page.social_image?.trim() || "";
  const heroAlt = page.image_alt?.trim() || heading;
  const wa = contact.whatsappHref ?? whatsappHref(contact.phone);

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-8 md:py-12 lg:px-6">
      <div className="mx-auto max-w-[36rem] text-center">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
          Bergasports · Dedemsvaart
        </p>
        <h1 className="section-rule section-rule-center font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-4xl lg:text-[2.6rem]">
          {heading}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--foreground)]/75 md:text-lg">
          {t.appointmentIntro}
        </p>
      </div>

      <div id="formulier" className="mx-auto mt-8 max-w-[36rem] scroll-mt-28">
        <ContactLeadForm kind="appointment" hideHeading hours={hours} />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href={shopPhoneTelHref(contact.phone)}
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--brand-border)] bg-white px-5 text-xs font-bold uppercase tracking-[0.14em] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            {t.callPhone(contact.phone)}
          </a>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--brand-border)] bg-white px-5 text-xs font-bold uppercase tracking-[0.14em] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
        <p className="mt-3 text-center text-xs text-[var(--foreground)]/55">{contact.address}</p>
      </div>

      <div className="mx-auto mt-14 grid max-w-[1100px] items-start gap-8 md:grid-cols-2 md:gap-12">
        {hero ? (
          <figure className="overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-surface-alt)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={heroAlt} className="aspect-[4/3] w-full object-cover object-center" />
          </figure>
        ) : null}
        {page.body_html ? (
          <div
            className="cms-html cms-page-body max-w-none text-[var(--foreground)]/85"
            dangerouslySetInnerHTML={{ __html: page.body_html }}
          />
        ) : null}
      </div>
    </section>
  );
}
