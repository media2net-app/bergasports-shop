import "server-only";

import { resolveSiteEmailLogoUrl, SITE_EMAIL, usableEmailLogoUrl } from "@/lib/site-brand";
import {
  SHOP_PHONE_LABEL,
  SITE_ADDRESS,
  SITE_KVK,
  whatsappHref,
} from "@/lib/site-contact";
import { parseOpeningHoursJson } from "@/lib/opening-hours";
import { SHOP_OPENING_HOURS, SHOP_OPENING_HOURS_SHORT } from "@/lib/site-content";
import { parseFreeShippingThreshold } from "@/lib/shop-delivery-trust";
import { getRuntimeSetting } from "@/lib/site-settings-db";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";

export type ShopPublicContact = {
  phone: string;
  email: string;
  address: string;
  kvk: string;
  vat: string;
  hoursShort: string;
  whatsapp: string;
  whatsappHref: string | null;
};

export async function getShopPublicContact(): Promise<ShopPublicContact> {
  const [phone, email, address, kvk, vat, hoursShort, whatsapp] = await Promise.all([
    getRuntimeSetting("SHOP_PHONE"),
    getRuntimeSetting("SHOP_EMAIL"),
    getRuntimeSetting("SHOP_ADDRESS"),
    getRuntimeSetting("SHOP_KVK"),
    getRuntimeSetting("SHOP_VAT_NUMBER"),
    getRuntimeSetting("SHOP_OPENING_HOURS_SHORT"),
    getRuntimeSetting("WHATSAPP_NUMBER"),
  ]);
  const wa = whatsapp.trim();
  return {
    phone: phone.trim() || SHOP_PHONE_LABEL,
    email: email.trim() || SITE_EMAIL,
    address: address.trim() || SITE_ADDRESS,
    kvk: kvk.trim() || SITE_KVK,
    vat: vat.trim(),
    hoursShort: hoursShort.trim() || SHOP_OPENING_HOURS_SHORT,
    whatsapp: wa,
    whatsappHref: whatsappHref(wa),
  };
}

export async function getShopOpeningHours() {
  const raw = await getRuntimeSetting("SHOP_OPENING_HOURS_JSON");
  return parseOpeningHoursJson(raw, SHOP_OPENING_HOURS);
}

export async function getEmailLogoUrlSetting(): Promise<string> {
  const fromSettings = (await getRuntimeSetting("NEXT_PUBLIC_EMAIL_LOGO_URL")).trim();
  // Always an absolute public URL suitable for <img> in SMTP e-mail clients.
  return usableEmailLogoUrl(fromSettings) || resolveSiteEmailLogoUrl();
}

export async function getWinBackEmailSettings(): Promise<{ code: string; expiryDays: number }> {
  const [codeRaw, daysRaw] = await Promise.all([
    getRuntimeSetting("MARKETING_WINBACK_CODE"),
    getRuntimeSetting("MARKETING_WINBACK_EXPIRY_DAYS"),
  ]);
  const days = Number.parseInt(daysRaw.trim() || "14", 10);
  return {
    code: codeRaw.trim() || "TERUG10",
    expiryDays: Number.isFinite(days) && days > 0 ? days : 14,
  };
}

export async function getLowStockThresholdSetting(): Promise<number> {
  const raw = (await getRuntimeSetting("LOW_STOCK_THRESHOLD")).trim();
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : LOW_STOCK_THRESHOLD;
}

export async function getFreeShippingThresholdSetting(): Promise<number> {
  const raw = await getRuntimeSetting("NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_EUR");
  return parseFreeShippingThreshold(raw);
}
