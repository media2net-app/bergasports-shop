"use client";

import Script from "next/script";

type AnalyticsScriptsProps = {
  ga4?: string;
  gtm?: string;
};

/** GA4 + optional GTM. IDs komen uit admin-instellingen of env. */
export default function AnalyticsScripts({ ga4, gtm }: AnalyticsScriptsProps) {
  const ga = ga4?.trim();
  const tm = gtm?.trim();
  if (!ga && !tm) return null;

  return (
    <>
      {tm ? (
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${tm}');
        `}</Script>
      ) : null}
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ga}', { anonymize_ip: true });
          `}</Script>
        </>
      ) : null}
    </>
  );
}

export function trackCommerceEvent(
  name: "view_item" | "add_to_cart" | "begin_checkout" | "purchase",
  params?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  const w = window as Window & { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: name, ...params });
  if (typeof w.gtag === "function") {
    w.gtag("event", name, params ?? {});
  }
}
