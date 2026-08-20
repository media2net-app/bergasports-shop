import LocalizedLink from "@/components/locale/LocalizedLink";

import { getRequestLocale } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import { shopPhoneTelHref, whatsappHref } from "@/lib/site-contact";
import { getShopPublicContact } from "@/lib/shop-runtime";

const btnPrimary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--topbar)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#2a2a2a]";
const btnGold =
  "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--brand-mid)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a] transition hover:bg-[#f2d680]";
const btnGhost =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--brand-border)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]";

export default async function ContentCtaCard() {
  const [contact, locale] = await Promise.all([getShopPublicContact(), getRequestLocale()]);
  const t = ui(locale);
  const wa = contact.whatsappHref ?? whatsappHref(contact.phone);

  return (
    <div className="rounded-3xl border border-[var(--brand-border)] bg-white p-5 shadow-[0_8px_30px_-18px_rgb(26_21_36_/_0.35)] md:p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand)]">
        {t.ctaAdviceEyebrow}
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl tracking-tight text-[var(--foreground)]">
        {t.ctaAdviceTitle}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]/70">{t.ctaAdviceText}</p>
      <div className="mt-5 flex flex-col gap-2.5">
        <LocalizedLink href="/afspraak#formulier" className={btnGold}>
          {t.planAppointmentShort}
        </LocalizedLink>
        <LocalizedLink href="/shop" className={btnPrimary}>
          {t.toShop}
        </LocalizedLink>
        <a href={shopPhoneTelHref(contact.phone)} className={btnGhost}>
          {t.callPhone(contact.phone)}
        </a>
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={btnGhost}>
            WhatsApp
          </a>
        ) : null}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-[var(--foreground)]/55">{contact.address}</p>
    </div>
  );
}
