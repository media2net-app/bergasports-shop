import LocalizedLink from "@/components/locale/LocalizedLink";

import CookiePreferencesLink from "@/components/cookie/CookiePreferencesLink";
import { SITE_BRAND_NAME, SITE_BRAND_SHORT, SITE_EMAIL, SITE_SLOGAN, SITE_TAGLINE } from "@/lib/site-brand";
import { SHOP_PHONE_LABEL, SITE_ADDRESS, SITE_KVK, shopPhoneTelHref } from "@/lib/site-contact";
import { INSTAGRAM_URL, LEGAL_PAGE_PATHS, SHOP_OPENING_HOURS } from "@/lib/site-content";
import { getInstagramPublicUrl } from "@/lib/instagram";
import { getShopOpeningHours, getShopPublicContact } from "@/lib/shop-runtime";

const CONSUWIJZER_URL = "https://www.consuwijzer.nl/";
const EU_ODR_URL = "https://ec.europa.eu/consumers/odr";

const footerLink =
  "text-[var(--topbar-muted)] underline-offset-4 transition-colors hover:text-[var(--brand-mid)] hover:underline";

const footerHeading =
  "text-sm font-semibold uppercase tracking-wide text-[var(--topbar-foreground)] after:mt-2 after:block after:h-[2px] after:w-8 after:rounded-full after:bg-gradient-to-r after:from-[var(--brand)] after:to-[var(--brand-mid)]";

const legalLink = "transition-colors hover:text-[var(--brand-mid)]";

export default async function Footer() {
  const [contact, hours, instagramUrl] = await Promise.all([
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
  ]);

  return (
    <footer className="relative mt-20 bg-[var(--topbar)] text-[var(--topbar-foreground)]">
      <span
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent"
        aria-hidden
      />
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
          <h4 className={footerHeading}>Winkel</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <LocalizedLink href="/shop" className={footerLink}>
                Webshop
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/merken" className={footerLink}>
                Merken
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/nieuws" className={footerLink}>
                Nieuws
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/verzending" className={footerLink}>
                Verzending
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/retouren" className={footerLink}>
                Retouren
              </LocalizedLink>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={footerHeading}>Bergasports</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <LocalizedLink href="/over-ons" className={footerLink}>
                Over ons
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/onderhoud" className={footerLink}>
                Onderhoud
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/afspraak" className={footerLink}>
                Afspraak
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href="/contact" className={footerLink}>
                Contact
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
          <h4 className={footerHeading}>Contact</h4>
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

          <h4 className={`${footerHeading} mt-6`}>Openingstijden</h4>
          <dl className="mt-3 space-y-1 text-sm">
            {hours.map((row) => (
              <div key={row.day} className="flex justify-between gap-4">
                <dt className="text-[var(--topbar-muted)]">{row.day}</dt>
                <dd
                  className={
                    row.hours === "Gesloten"
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
                Voorwaarden
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href={LEGAL_PAGE_PATHS.privacy} className={legalLink}>
                Privacy
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink href={LEGAL_PAGE_PATHS.cookies} className={legalLink}>
                Cookies
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
