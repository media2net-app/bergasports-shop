"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  languageAlternateUrl,
  localeFromHost,
  type AppLocale,
} from "@/lib/i18n/locale-shared";

type Props = {
  className?: string;
  /** Override detected locale (server can pass). */
  locale?: AppLocale;
};

export default function LanguageSwitcher({ className = "", locale }: Props) {
  const pathname = usePathname() || "/";
  const current: AppLocale =
    locale ??
    (typeof window !== "undefined" ? localeFromHost(window.location.host) : "nl");

  const nlHref = languageAlternateUrl(pathname, "nl");
  const enHref = languageAlternateUrl(pathname, "en");

  const linkClass = (active: boolean) =>
    `text-[11px] font-bold uppercase tracking-[0.14em] transition ${
      active ? "text-white" : "text-white/55 hover:text-white"
    }`;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} aria-label="Taal">
      <a href={nlHref} className={linkClass(current === "nl")} hrefLang="nl">
        NL
      </a>
      <span className="text-white/30">|</span>
      <a href={enHref} className={linkClass(current === "en")} hrefLang="en">
        EN
      </a>
    </div>
  );
}
