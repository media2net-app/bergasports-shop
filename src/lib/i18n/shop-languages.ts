import "server-only";

import { cache } from "react";

import {
  catalogEntry,
  DEFAULT_LOCALE,
  type LocaleCatalogEntry,
  LOCALE_CATALOG,
} from "@/lib/i18n/locale-codes";
import { FALLBACK_NL, type ShopLanguage } from "@/lib/i18n/shop-language-types";
import { getPrisma } from "@/lib/prisma";

export type { ShopLanguage };
export { FALLBACK_NL };

function fromRow(row: {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
}): ShopLanguage {
  return {
    code: row.code,
    name: row.name,
    nativeName: row.nativeName,
    enabled: row.enabled,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
  };
}

async function ensureDefaultLanguage(): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) return;
  const existing = await prisma.shopLanguage.findUnique({ where: { code: DEFAULT_LOCALE } });
  if (existing) return;
  const entry = catalogEntry(DEFAULT_LOCALE);
  await prisma.shopLanguage.create({
    data: {
      code: DEFAULT_LOCALE,
      name: entry?.name ?? "Nederlands",
      nativeName: entry?.nativeName ?? "Nederlands",
      enabled: true,
      isDefault: true,
      sortOrder: 0,
    },
  });
}

export const listShopLanguages = cache(async (): Promise<ShopLanguage[]> => {
  const prisma = getPrisma();
  if (!prisma) return [FALLBACK_NL];
  try {
    await ensureDefaultLanguage();
    const rows = await prisma.shopLanguage.findMany({
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    if (!rows.length) return [FALLBACK_NL];
    return rows.map(fromRow);
  } catch {
    return [FALLBACK_NL];
  }
});

export async function listEnabledShopLanguages(): Promise<ShopLanguage[]> {
  const rows = await listShopLanguages();
  const enabled = rows.filter((row) => row.enabled);
  return enabled.length ? enabled : [FALLBACK_NL];
}

export async function getDefaultShopLocale(): Promise<string> {
  const rows = await listShopLanguages();
  return rows.find((row) => row.isDefault)?.code ?? DEFAULT_LOCALE;
}

export async function addShopLanguage(code: string): Promise<ShopLanguage> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  const normalized = code.trim().toLowerCase();
  const entry: LocaleCatalogEntry | undefined = catalogEntry(normalized);
  if (!entry && !/^[a-z]{2}$/.test(normalized)) {
    throw new Error("Ongeldige taalcode. Gebruik een code van twee letters, zoals en of de.");
  }
  await ensureDefaultLanguage();
  const existing = await prisma.shopLanguage.findUnique({ where: { code: normalized } });
  if (existing) {
    throw new Error(`Taal “${normalized}” bestaat al.`);
  }
  const maxSort = await prisma.shopLanguage.aggregate({ _max: { sortOrder: true } });
  const row = await prisma.shopLanguage.create({
    data: {
      code: normalized,
      name: entry?.name ?? normalized.toUpperCase(),
      nativeName: entry?.nativeName ?? normalized.toUpperCase(),
      enabled: true,
      isDefault: false,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
    },
  });
  return fromRow(row);
}

export async function updateShopLanguage(
  code: string,
  patch: { enabled?: boolean; isDefault?: boolean; name?: string; nativeName?: string },
): Promise<ShopLanguage> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  const current = await prisma.shopLanguage.findUnique({ where: { code } });
  if (!current) throw new Error("Taal niet gevonden.");

  if (patch.isDefault) {
    await prisma.shopLanguage.updateMany({ data: { isDefault: false }, where: { isDefault: true } });
    const row = await prisma.shopLanguage.update({
      where: { code },
      data: {
        isDefault: true,
        enabled: true,
        name: patch.name?.trim() || current.name,
        nativeName: patch.nativeName?.trim() || current.nativeName,
      },
    });
    return fromRow(row);
  }

  if (current.isDefault && patch.enabled === false) {
    throw new Error("De standaardtaal kun je niet uitzetten.");
  }

  const row = await prisma.shopLanguage.update({
    where: { code },
    data: {
      enabled: patch.enabled ?? current.enabled,
      name: patch.name?.trim() || current.name,
      nativeName: patch.nativeName?.trim() || current.nativeName,
    },
  });
  return fromRow(row);
}

export async function deleteShopLanguage(code: string): Promise<void> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  if (code === DEFAULT_LOCALE) {
    throw new Error("Nederlands kun je niet verwijderen.");
  }
  const current = await prisma.shopLanguage.findUnique({ where: { code } });
  if (!current) throw new Error("Taal niet gevonden.");
  if (current.isDefault) {
    throw new Error("Zet eerst een andere taal als standaard.");
  }
  await prisma.shopLanguage.delete({ where: { code } });
}

export function unusedCatalogLanguages(existing: ShopLanguage[]): LocaleCatalogEntry[] {
  const have = new Set(existing.map((row) => row.code));
  return LOCALE_CATALOG.filter((row) => !have.has(row.code));
}
