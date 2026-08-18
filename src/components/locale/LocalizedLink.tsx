"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useShopLocale } from "@/components/locale/ShopLanguagesProvider";
import { localizedHref } from "@/lib/i18n/locale-shared";

type Props = ComponentProps<typeof Link>;

function prefixHref(href: Props["href"], locale: string, defaultLocale: string): Props["href"] {
  if (typeof href === "string") {
    return localizedHref(href, locale, defaultLocale);
  }
  if (href && typeof href === "object" && "pathname" in href && href.pathname) {
    return { ...href, pathname: localizedHref(href.pathname, locale, defaultLocale) };
  }
  return href;
}

/** Storefront Link that keeps the current locale prefix (`/en/...`). */
export default function LocalizedLink({ href, ...props }: Props) {
  const { locale, defaultLocale } = useShopLocale();
  return <Link href={prefixHref(href, locale, defaultLocale)} {...props} />;
}
