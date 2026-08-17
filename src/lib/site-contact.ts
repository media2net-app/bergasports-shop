import { SITE_ADDRESS, SITE_KVK } from "@/lib/site-content";

/** Shop-wide phone (display + tel link). */
export const SHOP_PHONE_LABEL = "06 - 8316 2631";

export { SITE_ADDRESS, SITE_KVK };

export function shopPhoneTelHref(phone: string = SHOP_PHONE_LABEL): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("06")) {
    return `tel:+31${digits.slice(1)}`;
  }
  if (digits.startsWith("0")) {
    return `tel:+31${digits.slice(1)}`;
  }
  return `tel:+${digits}`;
}

/** WhatsApp-chatlink (`https://wa.me/316…`) uit een NL- of internationaal nummer. */
export function whatsappHref(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const intl = digits.startsWith("00")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? `31${digits.slice(1)}`
      : digits;
  return `https://wa.me/${intl}`;
}
