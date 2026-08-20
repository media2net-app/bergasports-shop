import "server-only";

import { cache } from "react";

import { requirePrisma } from "@/lib/database";
import {
  SITE_SETTING_DEFS,
  getSettingDef,
  isMaskedSecretInput,
  maskSecretValue,
  type AdminSettingFieldView,
} from "@/lib/site-settings-defs";

export type { AdminSettingFieldView } from "@/lib/site-settings-defs";

export type SiteSettingSkip = {
  key: string;
  reason: "keep_existing" | "masked_placeholder" | "unknown_key" | "undefined";
};

async function loadAllDbSettingsUncached(): Promise<Map<string, string>> {
  const prisma = requirePrisma();
  try {
    const rows = await prisma.siteSetting.findMany({
      select: { key: true, value: true },
    });
    return new Map(rows.map((r) => [r.key, r.value]));
  } catch (e) {
    // Tabel bestaat nog niet vóór migrate — val terug op env.
    console.error(
      "[site-settings] load failed, falling back to env:",
      e instanceof Error ? e.message : e,
    );
    return new Map();
  }
}

/** Per-request cache for reads. Do not use after writes in the same request. */
const loadAllDbSettings = cache(loadAllDbSettingsUncached);

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

/** Fresh DB read (no React cache) — use after writes or when a key must not be stale. */
export async function getRuntimeSettingFresh(key: string): Promise<string> {
  const def = getSettingDef(key);
  const envKey = def?.envKey ?? key;
  const db = await loadAllDbSettingsUncached();
  const fromDb = db.get(key)?.trim() ?? "";
  if (fromDb) return fromDb;
  return envValue(envKey);
}

export async function getRuntimeSettingOrEnv(key: string, envKey?: string): Promise<string> {
  const db = await loadAllDbSettings();
  const fromDb = db.get(key)?.trim() ?? "";
  if (fromDb) return fromDb;
  return envValue(envKey ?? key);
}

/** Key names only — never values. */
export async function listSiteSettingKeys(): Promise<string[]> {
  const prisma = requirePrisma();
  try {
    const rows = await prisma.siteSetting.findMany({
      select: { key: true },
      orderBy: { key: "asc" },
    });
    return rows.map((r) => r.key);
  } catch (e) {
    console.error(
      "[site-settings] list keys failed:",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

export async function buildAdminSettingsView(options?: {
  /** Skip React cache — required after upsert in the same request. */
  fresh?: boolean;
}): Promise<AdminSettingFieldView[]> {
  const db = options?.fresh ? await loadAllDbSettingsUncached() : await loadAllDbSettings();
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
): Promise<{ saved: string[]; cleared: string[]; skipped: SiteSettingSkip[] }> {
  const prisma = requirePrisma();
  const saved: string[] = [];
  const cleared: string[] = [];
  const skipped: SiteSettingSkip[] = [];

  for (const [key, raw] of Object.entries(updates)) {
    const def = getSettingDef(key);
    if (!def) {
      skipped.push({ key, reason: "unknown_key" });
      continue;
    }
    if (raw === undefined) {
      skipped.push({ key, reason: "undefined" });
      continue;
    }
    const trimmed = typeof raw === "string" ? raw.trim() : "";

    // Lege string bij geheim = niet overschrijven (laat bestaande staan).
    if (def.secret && trimmed === "") {
      skipped.push({ key, reason: "keep_existing" });
      continue;
    }

    if (trimmed === "") {
      await prisma.siteSetting.deleteMany({ where: { key } });
      cleared.push(key);
      continue;
    }

    // Zelfde mask / placeholder opnieuw opslaan negeren — nooit wissen.
    if (def.secret && isMaskedSecretInput(trimmed)) {
      skipped.push({ key, reason: "masked_placeholder" });
      continue;
    }

    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value: trimmed, updatedBy: updatedBy ?? null },
      update: { value: trimmed, updatedBy: updatedBy ?? null },
    });
    saved.push(key);
  }

  return { saved, cleared, skipped };
}
