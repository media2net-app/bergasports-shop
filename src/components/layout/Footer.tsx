import Link from "next/link";

import CookiePreferencesLink from "@/components/cookie/CookiePreferencesLink";
import { SITE_BRAND_NAME, SITE_BRAND_SHORT, SITE_EMAIL, SITE_SLOGAN, SITE_TAGLINE } from "@/lib/site-brand";
import { SHOP_PHONE_LABEL, SITE_ADDRESS, SITE_KVK, shopPhoneTelHref } from "@/lib/site-contact";

const CONSUWIJZER_URL = "https://www.consuwijzer.nl/";
const EU_ODR_URL = "https://ec.europa.eu/consumers/odr";

const footerLink =
  "text-[var(--topbar-muted)] transition hover:text-[var(--brand)] hover:underline";

export default function Footer() {
  return (
    <footer className="mt-20 bg-[var(--topbar)] text-[var(--topbar-foreground)]">
      <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-[var(--topbar-foreground)]">
            {SITE_BRAND_NAME}
          </h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--topbar-muted)]">
            {SITE_SLOGAN}
          </p>
          <p className="mt-2 text-sm text-[var(--topbar-muted)]">{SITE_TAGLINE}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--topbar-foreground)]">
            Klantenservice
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/despre-noi" className={footerLink}>
                Over ons
              </Link>
            </li>
            <li>
              <Link href="/contact" className={footerLink}>
                Contact
              </Link>
            </li>
            <li>
              <Link href="/livrare-si-retur" className={footerLink}>
                Verzending en retour
              </Link>
            </li>
            <li>
              <Link href="/metode-de-plata" className={footerLink}>
                Betaalmethoden
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--topbar-foreground)]">
            Juridisch
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/termeni-si-conditii" className={footerLink}>
                Algemene voorwaarden
              </Link>
            </li>
            <li>
              <Link href="/politica-de-confidentialitate" className={footerLink}>
                Privacybeleid (AVG)
              </Link>
            </li>
            <li>
              <Link href="/politica-cookies" className={footerLink}>
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
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[var(--topbar-foreground)]">
            Contact
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`mailto:${SITE_EMAIL}`} className={footerLink}>
                {SITE_EMAIL}
              </a>
            </li>
            <li>
              <a href={shopPhoneTelHref()} className={footerLink}>
                {SHOP_PHONE_LABEL}
              </a>
            </li>
            <li className="text-[var(--topbar-muted)]">{SITE_ADDRESS}</li>
            <li className="text-[var(--topbar-muted)]">KvK: {SITE_KVK}</li>
          </ul>
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
