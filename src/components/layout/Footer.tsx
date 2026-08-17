import Link from "next/link";

import CookiePreferencesLink from "@/components/cookie/CookiePreferencesLink";
import { SITE_BRAND_NAME, SITE_BRAND_SHORT, SITE_EMAIL, SITE_SLOGAN, SITE_TAGLINE } from "@/lib/site-brand";
import { SHOP_PHONE_LABEL, SITE_ADDRESS, SITE_KVK, shopPhoneTelHref } from "@/lib/site-contact";
import { INSTAGRAM_URL, LEGAL_PAGE_PATHS, SHOP_OPENING_HOURS } from "@/lib/site-content";
import { getShopOpeningHours, getShopPublicContact } from "@/lib/shop-runtime";

const CONSUWIJZER_URL = "https://www.consuwijzer.nl/";
const EU_ODR_URL = "https://ec.europa.eu/consumers/odr";

const footerLink =
  "text-[var(--topbar-muted)] underline-offset-4 transition-colors hover:text-[var(--brand-mid)] hover:underline";

const footerHeading =
  "text-sm font-semibold uppercase tracking-wide text-[var(--topbar-foreground)] after:mt-2 after:block after:h-[2px] after:w-8 after:rounded-full after:bg-gradient-to-r after:from-[var(--brand)] after:to-[var(--brand-mid)]";

export default async function Footer() {
  const [contact, hours] = await Promise.all([
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
  ]);

  return (
    <footer className="relative mt-20 bg-[var(--topbar)] text-[var(--topbar-foreground)]">
      <span
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent"
        aria-hidden
      />
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-12 md:grid-cols-4">
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
          <h4 className={footerHeading}>
            Klantenservice
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/over-ons" className={footerLink}>
                Over ons
              </Link>
            </li>
            <li>
              <Link href="/merken" className={footerLink}>
                Merken
              </Link>
            </li>
            <li>
              <Link href="/onderhoud" className={footerLink}>
                Onderhoud
              </Link>
            </li>
            <li>
              <Link href="/afspraak" className={footerLink}>
                Afspraak
              </Link>
            </li>
            <li>
              <Link href="/contact" className={footerLink}>
                Contact
              </Link>
            </li>
            <li>
              <Link href="/verzending" className={footerLink}>
                Verzending
              </Link>
            </li>
            <li>
              <Link href="/retouren" className={footerLink}>
                Retouren
              </Link>
            </li>
            <li>
              <Link href="/nieuws" className={footerLink}>
                Nieuws
              </Link>
            </li>
            <li>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLink}
              >
                Instagram
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={footerHeading}>
            Juridisch
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={LEGAL_PAGE_PATHS.terms} className={footerLink}>
                Algemene voorwaarden
              </Link>
            </li>
            <li>
              <Link href={LEGAL_PAGE_PATHS.privacy} className={footerLink}>
                Privacybeleid (AVG)
              </Link>
            </li>
            <li>
              <Link href={LEGAL_PAGE_PATHS.cookies} className={footerLink}>
                Cookiebeleid
              </Link>
            </li>
            <li>
              <CookiePreferencesLink className={footerLink} />
            </li>
            <li>
              <a href={CONSUWIJZER_URL} target="_blank" rel="noopener noreferrer" className={footerLink}>
                Consuwijzer
              </a>
            </li>
            <li>
              <a href={EU_ODR_URL} target="_blank" rel="noopener noreferrer" className={footerLink}>
                Online geschillen (EU)
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={footerHeading}>
            Contact
          </h4>
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
        <p className="mx-auto max-w-[1440px] px-4 py-4 text-center text-xs text-[var(--topbar-muted)]">
          © {new Date().getFullYear()} {SITE_BRAND_SHORT} · Dedemsvaart
        </p>
      </div>
    </footer>
  );
}
