import "server-only";

import { cache } from "react";

import { requirePrisma } from "@/lib/database";
import {
  SITE_SETTING_DEFS,
  getSettingDef,
  maskSecretValue,
  type AdminSettingFieldView,
} from "@/lib/site-settings-defs";

export type { AdminSettingFieldView } from "@/lib/site-settings-defs";

const loadAllDbSettings = cache(async (): Promise<Map<string, string>> => {
  const prisma = requirePrisma();
  try {
    const rows = await prisma.siteSetting.findMany({
      select: { key: true, value: true },
    });
    return new Map(rows.map((r) => [r.key, r.value]));
  } catch {
    // Tabel bestaat nog niet vóór migrate — val terug op env.
    return new Map();
  }
});

function envValue(envKey: string): string {
  return process.env[envKey]?.trim() ?? "";
}

/** Effectieve waarde: DB override > env. */
export async function getRuntimeSetting(key: string): Promise<string> {
  const def = getSettingDef(key);
  const envKey = def?.envKey ?? key;
  const db = await loadAllDbSettings();
  const fromDb = db.get(key)?.trim() ?? "";
  if (fromDb) {
    return fromDb;
  }
  return envValue(envKey);
}

export async function getRuntimeSettingOrEnv(key: string, envKey?: string): Promise<string> {
  const db = await loadAllDbSettings();
  const fromDb = db.get(key)?.trim() ?? "";
  if (fromDb) return fromDb;
  return envValue(envKey ?? key);
}

export async function buildAdminSettingsView(): Promise<AdminSettingFieldView[]> {
  const db = await loadAllDbSettings();
  return SITE_SETTING_DEFS.map((def) => {
    const fromDb = db.get(def.key)?.trim() ?? "";
    const fromEnv = envValue(def.envKey);
    const effective = fromDb || fromEnv;
    const source: AdminSettingFieldView["source"] = fromDb
      ? "database"
      : fromEnv
        ? "env"
        : "missing";
    return {
      key: def.key,
      label: def.label,
      group: def.group,
      secret: def.secret,
      optional: Boolean(def.optional),
      placeholder: def.placeholder,
      configured: Boolean(effective),
      source,
      displayValue: def.secret
        ? effective
          ? maskSecretValue(effective)
          : ""
        : effective,
      multiline: Boolean(def.multiline),
      hidden: Boolean(def.hidden),
      manual: def.manual,
    };
  });
}

export async function upsertSiteSettings(
  updates: Record<string, string | null | undefined>,
  updatedBy?: string,
): Promise<{ saved: string[]; cleared: string[] }> {
  const prisma = requirePrisma();
  const saved: string[] = [];
  const cleared: string[] = [];

  for (const [key, raw] of Object.entries(updates)) {
    const def = getSettingDef(key);
    if (!def) {
      continue;
    }
    if (raw === undefined) {
      continue;
    }
    const trimmed = typeof raw === "string" ? raw.trim() : "";

    // Lege string bij geheim = niet overschrijven (laat bestaande staan).
    if (def.secret && trimmed === "") {
      continue;
    }

    if (trimmed === "") {
      await prisma.siteSetting.deleteMany({ where: { key } });
      cleared.push(key);
      continue;
    }

    // Zelfde mask opnieuw opslaan negeren
    if (def.secret && /^•{4,}/.test(trimmed)) {
      continue;
    }

    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: trimmed, updatedBy: updatedBy ?? null },
      update: { value: trimmed, updatedBy: updatedBy ?? null },
    });
    saved.push(key);
  }

  return { saved, cleared };
}
