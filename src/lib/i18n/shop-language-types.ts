import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";

export type ShopLanguage = {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
};

export const FALLBACK_NL: ShopLanguage = {
  code: DEFAULT_LOCALE,
  name: "Nederlands",
  nativeName: "Nederlands",
  enabled: true,
  isDefault: true,
  sortOrder: 0,
};
