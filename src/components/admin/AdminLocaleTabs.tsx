"use client";

import type { ShopLanguage } from "@/lib/i18n/shop-language-types";

type Props = {
  languages: ShopLanguage[];
  value: string;
  onChange: (code: string) => void;
  filledLocales?: Iterable<string>;
  hint?: string;
};

export default function AdminLocaleTabs({
  languages,
  value,
  onChange,
  filledLocales,
  hint,
}: Props) {
  const enabled = languages.filter((row) => row.enabled);
  if (enabled.length < 2) {
    return null;
  }
  const filled = new Set(filledLocales);

  return (
    <div className="admin-locale-tabs-wrap">
      <div className="admin-locale-tabs" role="tablist" aria-label="Taal">
        {enabled.map((lang) => {
          const active = lang.code === value;
          const hasCopy = filled.has(lang.code);
          return (
            <button
              key={lang.code}
              type="button"
              role="tab"
              aria-selected={active}
              className={`admin-locale-tab${active ? " is-active" : ""}${hasCopy ? "" : " is-empty"}`}
              onClick={() => onChange(lang.code)}
            >
              <span className="admin-locale-tab-code">{lang.code.toUpperCase()}</span>
              <span className="admin-locale-tab-name">{lang.name}</span>
              {lang.isDefault ? <span className="admin-locale-tab-default">standaard</span> : null}
            </button>
          );
        })}
      </div>
      {hint ? <p className="admin-muted admin-m-0">{hint}</p> : null}
    </div>
  );
}
