import Link from "next/link";
import type { ReactNode } from "react";

import { getRequestLocale } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import { SITE_DEFAULT_CURRENCY } from "@/lib/site-brand";
import {
  RETURNS_DAYS,
  RETURNS_POLICY_PATH,
  formatEstimatedDeliveryRange,
  formatFreeShippingThreshold,
} from "@/lib/shop-delivery-trust";

type Props = {
  freeCargo?: boolean;
  currency?: string;
  className?: string;
  freeShippingThreshold?: number;
};

function IconTruck() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17.5" cy="18" r="1.6" />
    </svg>
  );
}

function IconReturn() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 9h11a5 5 0 010 10H9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 5L3.5 9 7 13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 3l7 3v5c0 4.2-2.9 7.9-7 9-4.1-1.1-7-4.8-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M4 9h16v11H4zM3 9l2-4h14l2 4" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" strokeLinejoin="round" />
    </svg>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-[var(--brand)]" aria-hidden>
        {icon}
      </span>
      <span className="text-sm leading-snug text-[var(--foreground)]/80">{children}</span>
    </li>
  );
}

/** Compacte trust-signalen direct onder de CTA — vervangt het lange verzendpaneel op de PDP. */
export default async function ProductTrustRow({
  freeCargo = false,
  currency = SITE_DEFAULT_CURRENCY,
  className = "",
  freeShippingThreshold,
}: Props) {
  const locale = await getRequestLocale();
  const t = ui(locale);

  return (
    <ul className={`space-y-2.5 ${className}`} aria-label={t.trustShippingReturnsPay}>
      <Row icon={<IconTruck />}>
        {t.deliveredBetween}{" "}
        <span className="font-semibold text-[var(--foreground)]">
          {formatEstimatedDeliveryRange()}
        </span>{" "}
        {freeCargo ? (
          <span className="font-semibold text-[#166534]">{t.freeShippingNlShort}</span>
        ) : (
          <>{t.freeShippingFrom(formatFreeShippingThreshold(currency, freeShippingThreshold))}</>
        )}
      </Row>
      <Row icon={<IconReturn />}>
        <span className="font-semibold text-[var(--foreground)]">{t.returnsDays(RETURNS_DAYS)}</span>{" "}
        {t.coolingOff}{" "}
        <Link
          href={RETURNS_POLICY_PATH}
          className="font-semibold text-[#96741f] underline underline-offset-2"
        >
          {t.returnsConditions}
        </Link>
      </Row>
      <Row icon={<IconShield />}>{t.paySafeIdeal}</Row>
      <Row icon={<IconStore />}>{t.freePickupAppointment}</Row>
    </ul>
  );
}
