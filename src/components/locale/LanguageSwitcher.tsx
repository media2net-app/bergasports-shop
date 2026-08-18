"use client";

import { usePathname } from "next/navigation";

import { useShopLanguages, useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { DEFAULT_LOCALE, stripLocalePrefix, withLocalePrefix } from "@/lib/i18n/locale-shared";

type Props = {
  className?: string;
  locale?: string;
};

export default function LanguageSwitcher({ className = "", locale }: Props) {
  const pathname = usePathname() || "/";
  const { defaultLocale, locale: contextLocale } = useShopLocale();
  const languages = useShopLanguages().filter((row) => row.enabled);
  const { locale: prefix } = stripLocalePrefix(pathname);
  const current = locale ?? prefix ?? contextLocale ?? defaultLocale ?? DEFAULT_LOCALE;

  if (languages.length < 2) {
    return null;
  }

  const { pathname: rest } = stripLocalePrefix(pathname);

  const linkClass = (active: boolean) =>
    `text-[11px] font-bold uppercase tracking-[0.14em] transition ${
      active ? "text-white" : "text-white/55 hover:text-white"
    }`;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} aria-label="Taal">
      {languages.map((lang, index) => (
        <span key={lang.code} className="inline-flex items-center gap-1.5">
          {index > 0 ? <span className="text-white/30">|</span> : null}
          <a
            href={withLocalePrefix(rest, lang.code, defaultLocale)}
            className={linkClass(current === lang.code)}
            hrefLang={lang.code}
          >
            {lang.code.toUpperCase()}
          </a>
        </span>
      ))}
    </div>
  );
}
