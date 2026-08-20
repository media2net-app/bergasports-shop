import LocalizedLink from "@/components/locale/LocalizedLink";

import CookiePreferencesLink from "@/components/cookie/CookiePreferencesLink";
import NewsletterSignupForm from "@/components/layout/NewsletterSignupForm";
import { getRequestLocale } from "@/lib/i18n/locale";
import { localizeOpeningHoursRows, ui } from "@/lib/i18n/ui";
import { SITE_BRAND_NAME, SITE_BRAND_SHORT, SITE_EMAIL, SITE_SLOGAN, SITE_TAGLINE } from "@/lib/site-brand";
import { SHOP_PHONE_LABEL, SITE_ADDRESS, SITE_KVK, shopPhoneTelHref } from "@/lib/site-contact";
import { INSTAGRAM_URL, LEGAL_PAGE_PATHS, SHOP_OPENING_HOURS } from "@/lib/site-content";
import { getInstagramPublicUrl } from "@/lib/instagram";
import { getNewsletterPromo } from "@/lib/newsletter";
import { getShopOpeningHours, getShopPublicContact } from "@/lib/shop-runtime";

const CONSUWIJZER_URL = "https://www.consuwijzer.nl/";
const EU_ODR_URL = "https://ec.europa.eu/consumers/odr";

const footerLink =
  "text-[var(--topbar-muted)] underline-offset-4 transition-colors hover:text-[var(--brand-mid)] hover:underline";

const footerHeading =
  "text-sm font-semibold uppercase tracking-wide text-[var(--topbar-foreground)] after:mt-2 after:block after:h-[2px] after:w-8 after:rounded-full after:bg-gradient-to-r after:from-[var(--brand)] after:to-[var(--brand-mid)]";

const legalLink = "transition-colors hover:text-[var(--brand-mid)]";

export default async function Footer() {
  const locale = await getRequestLocale();
  const t = ui(locale);
  const [contact, hoursRaw, instagramUrl, promo] = await Promise.all([
    getShopPublicContact().catch(() => ({
      phone: SHOP_PHONE_LABEL,
      email: SITE_EMAIL,
      address: SITE_ADDRESS,
      kvk: SITE_KVK,
      vat: "",
      hoursShort: "",
      whatsapp: "",
      whatsappHref: null as string | null,
    })),
    getShopOpeningHours().catch(() => SHOP_OPENING_HOURS),
    getInstagramPublicUrl().catch(() => INSTAGRAM_URL),
    getNewsletterPromo().catch(() => ({
      code: "WELCOME5",
      percent: 5,
      label: "5% korting",
    })),
  ]);
  const hours = localizeOpeningHoursRows(hoursRaw, locale);
  const promoLabel = promo.percent > 0 ? t.percentOff(promo.percent) : promo.label;

  return (
    <footer className="relative mt-20 bg-[var(--topbar)] text-[var(--topbar-foreground)]">
      <span
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-10 lg:px-6">
        <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-6 md:grid-cols-[1.2fr_1fr] md:items-center md:px-8 md:py-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-mid)]">
              {t.newsletterEyebrow(promoLabel)}
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight md:text-2xl">
              {t.newsletterTitle}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--topbar-muted)]">
              {t.newsletterText(promoLabel)}
            </p>
          </div>
          <NewsletterSignupForm promoLabel={promoLabel} source="footer" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--topbar-foreground)]">
            {SITE_BRAND_NAME}
          </h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-mid)]">
            {SITE_SLOGAN}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--topbar-muted)]">{SITE_TAGLINE}</p>
        </div>
        <div>
          <h4 className={footerHeading}>{t.shop}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <LocalizedLink href="/shop" className={footerLink}>
                {t.webshop}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/merken" className={footerLink}>
                {t.brands}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/nieuws" className={footerLink}>
                {t.news}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/verzending" className={footerLink}>
                {t.shipping}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/retouren" className={footerLink}>
                {t.returns}
              </LocalizedLink>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={footerHeading}>{t.aboutBrand}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <LocalizedLink href="/over-ons" className={footerLink}>
                {t.about}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/onderhoud" className={footerLink}>
                {t.maintenance}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/afspraak" className={footerLink}>
                {t.appointment}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/contact" className={footerLink}>
                {t.contactHeading}
              </LocalizedLink>
            </li>
            <li>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={footerLink}>
                Instagram
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={footerHeading}>{t.contactHeading}</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`mailto:${contact.email}`} className={footerLink}>
                {contact.email}
              </a>
            </li>
            <li>
              <a href={shopPhoneTelHref(contact.phone)} className={footerLink}>
                {contact.phone}
              </a>
            </li>
            {contact.whatsappHref ? (
              <li>
                <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className={footerLink}>
                  WhatsApp
                </a>
              </li>
            ) : null}
            <li className="text-[var(--topbar-muted)]">{contact.address}</li>
            <li className="text-[var(--topbar-muted)]">KvK: {contact.kvk}</li>
            {contact.vat ? <li className="text-[var(--topbar-muted)]">BTW: {contact.vat}</li> : null}
          </ul>

          <h4 className={`${footerHeading} mt-6`}>{t.openingHours}</h4>
          <dl className="mt-3 space-y-1 text-sm">
            {hours.map((row) => (
              <div key={row.day} className="flex justify-between gap-4">
                <dt className="text-[var(--topbar-muted)]">{row.day}</dt>
                <dd
                  className={
                    row.hours === t.closed
                      ? "text-[var(--topbar-muted)]/70"
                      : "font-medium text-[var(--topbar-foreground)]"
                  }
                >
                  {row.hours}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-3 px-4 py-4 text-xs text-[var(--topbar-muted)] lg:px-6 sm:flex-row sm:flex-wrap sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE_BRAND_SHORT} · Dedemsvaart
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <li>
              <LocalizedLink href={LEGAL_PAGE_PATHS.terms} className={legalLink}>
                {t.terms}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href={LEGAL_PAGE_PATHS.privacy} className={legalLink}>
                {t.privacy}
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href={LEGAL_PAGE_PATHS.cookies} className={legalLink}>
                {t.cookies}
              </LocalizedLink>
            </li>
            <li>
              <CookiePreferencesLink className={legalLink} />
            </li>
            <li>
              <a href={CONSUWIJZER_URL} target="_blank" rel="noopener noreferrer" className={legalLink}>
                Consuwijzer
              </a>
            </li>
            <li>
              <a href={EU_ODR_URL} target="_blank" rel="noopener noreferrer" className={legalLink}>
                EU-geschillen
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
