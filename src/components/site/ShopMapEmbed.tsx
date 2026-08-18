import { SHOP_MAPS_EMBED_URL, SHOP_MAPS_URL, SITE_ADDRESS } from "@/lib/site-content";

export default function ShopMapEmbed({ className = "" }: { className?: string }) {
  return (
    <figure className={`overflow-hidden rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-surface-alt)] ${className}`.trim()}>
      <iframe
        title={`Kaart van ${SITE_ADDRESS}`}
        src={SHOP_MAPS_EMBED_URL}
        className="aspect-[16/10] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <figcaption className="px-4 py-3 text-sm text-[var(--foreground)]/70">
        {SITE_ADDRESS} ·{" "}
        <a href={SHOP_MAPS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--brand)] underline-offset-4 hover:underline">
          Open in Google Maps
        </a>
      </figcaption>
    </figure>
  );
}
