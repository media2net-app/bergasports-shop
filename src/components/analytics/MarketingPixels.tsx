"use client";

import Script from "next/script";

type MarketingPixelsProps = {
  metaPixelId?: string;
  googleAdsId?: string;
};

/** Meta Pixel + Google Ads — alleen laden na marketing-consent. */
export default function MarketingPixels({ metaPixelId, googleAdsId }: MarketingPixelsProps) {
  const meta = metaPixelId?.trim();
  const ads = googleAdsId?.trim();
  if (!meta && !ads) return null;

  return (
    <>
      {meta ? (
        <Script id="meta-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${meta}');
          fbq('track', 'PageView');
        `}</Script>
      ) : null}
      {ads ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ads}`} strategy="afterInteractive" />
          <Script id="google-ads" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${ads}');
          `}</Script>
        </>
      ) : null}
    </>
  );
}
