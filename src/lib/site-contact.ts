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
