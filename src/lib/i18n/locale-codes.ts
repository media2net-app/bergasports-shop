/** ISO 639-1 codes that may be added in Instellingen → Talen. */
export type LocaleCatalogEntry = {
  code: string;
  name: string;
  nativeName: string;
};

export const DEFAULT_LOCALE = "nl";

export const LOCALE_CATALOG: LocaleCatalogEntry[] = [
  { code: "nl", name: "Nederlands", nativeName: "Nederlands" },
  { code: "en", name: "Engels", nativeName: "English" },
  { code: "de", name: "Duits", nativeName: "Deutsch" },
  { code: "fr", name: "Frans", nativeName: "Français" },
  { code: "es", name: "Spaans", nativeName: "Español" },
  { code: "it", name: "Italiaans", nativeName: "Italiano" },
  { code: "pt", name: "Portugees", nativeName: "Português" },
  { code: "pl", name: "Pools", nativeName: "Polski" },
  { code: "da", name: "Deens", nativeName: "Dansk" },
  { code: "sv", name: "Zweeds", nativeName: "Svenska" },
  { code: "nb", name: "Noors", nativeName: "Norsk" },
  { code: "fi", name: "Fins", nativeName: "Suomi" },
  { code: "cs", name: "Tsjechisch", nativeName: "Čeština" },
  { code: "ro", name: "Roemeens", nativeName: "Română" },
  { code: "hu", name: "Hongaars", nativeName: "Magyar" },
  { code: "el", name: "Grieks", nativeName: "Ελληνικά" },
  { code: "tr", name: "Turks", nativeName: "Türkçe" },
  { code: "uk", name: "Oekraïens", nativeName: "Українська" },
  { code: "ja", name: "Japans", nativeName: "日本語" },
  { code: "zh", name: "Chinees", nativeName: "中文" },
];

export const LOCALE_CATALOG_BY_CODE = new Map(LOCALE_CATALOG.map((row) => [row.code, row]));

/** Prefix-codes that proxy.ts may strip (catalog + extra ISO 639-1). */
export const KNOWN_LOCALE_PREFIXES = new Set([
  ...LOCALE_CATALOG.map((row) => row.code),
  "ar",
  "bg",
  "bs",
  "ca",
  "et",
  "eu",
  "fa",
  "ga",
  "he",
  "hi",
  "hr",
  "id",
  "is",
  "ko",
  "lt",
  "lv",
  "mk",
  "sk",
  "sl",
  "sr",
  "th",
  "vi",
]);

export function isLocaleCode(value: string): boolean {
  return /^[a-z]{2}$/.test(value);
}

export function isKnownLocalePrefix(value: string): boolean {
  return KNOWN_LOCALE_PREFIXES.has(value.toLowerCase());
}

export function catalogEntry(code: string): LocaleCatalogEntry | undefined {
  return LOCALE_CATALOG_BY_CODE.get(code.toLowerCase());
}
