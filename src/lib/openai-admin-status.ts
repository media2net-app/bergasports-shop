import "server-only";

import { requirePrisma } from "@/lib/database";
import { getMagnificApiKey } from "@/lib/magnific-api-key";
import { getRuntimeSettingFresh, listSiteSettingKeys } from "@/lib/site-settings-db";

/** Candidate setting / env names, in priority order (same for status + image + normalize). */
export const OPENAI_API_KEY_CANDIDATES = [
  "OPENAI_API_KEY",
  "CHATGPT_API_KEY",
  "AI_IMAGE_API_KEY",
  "OPENAI_SECRET",
  "OPENAI_KEY",
  "AI_API_KEY",
  "GPT_API_KEY",
] as const;

export type OpenAiApiKeySource =
  | { kind: "runtime"; keyName: string }
  | { kind: "database"; keyName: string }
  | { kind: "env"; keyName: string }
  | { kind: "none" };

export type OpenAiApiKeyResolution = {
  key: string | null;
  source: OpenAiApiKeySource;
};

export type OpenAiApiKeyProbe = {
  /** Per known key: whether site_settings has a non-empty value (never the secret). */
  siteSettings: Record<string, boolean>;
  /** Per known key: whether process.env has a non-empty value. */
  env: Record<string, boolean>;
  /** Extra DB rows that look OpenAI-related (key name or sk-… value). */
  discoveredDbKeys: string[];
  /** All site_settings.key names (no values) — for diagnosing wrong field names. */
  allDbKeys: string[];
  /** Fresh getRuntimeSetting("OPENAI_API_KEY") non-empty? */
  runtimeOpenAi: boolean;
};

function looksLikeOpenAiSecret(value: string): boolean {
  const v = value.trim();
  return /^sk-[A-Za-z0-9_-]{10,}/.test(v) || /^sk-proj-[A-Za-z0-9_-]{10,}/.test(v);
}

function keyNameLooksOpenAi(key: string): boolean {
  return /openai|chatgpt|gpt.?api|ai.?api.?key|ai.?image.?api/i.test(key);
}

/**
 * Boolean-only probe for admin/debug (never includes secret values).
 * Same sources as resolveOpenAiApiKey. Always fresh DB read.
 */
export async function probeOpenAiApiKeySources(): Promise<OpenAiApiKeyProbe> {
  const siteSettings: Record<string, boolean> = {};
  const env: Record<string, boolean> = {};
  const discoveredDbKeys: string[] = [];

  for (const keyName of OPENAI_API_KEY_CANDIDATES) {
    siteSettings[keyName] = false;
    env[keyName] = Boolean(process.env[keyName]?.trim());
  }

  let runtimeOpenAi = false;
  try {
    runtimeOpenAi = Boolean((await getRuntimeSettingFresh("OPENAI_API_KEY")).trim());
  } catch {
    runtimeOpenAi = false;
  }

  let allDbKeys: string[] = [];
  try {
    allDbKeys = await listSiteSettingKeys();
  } catch {
    allDbKeys = [];
  }

  try {
    const prisma = requirePrisma();
    const rows = await prisma.siteSetting.findMany({
      select: { key: true, value: true },
    });
    for (const row of rows) {
      const value = row.value?.trim() ?? "";
      if (!value) continue;
      if ((OPENAI_API_KEY_CANDIDATES as readonly string[]).includes(row.key)) {
        siteSettings[row.key] = true;
      }
      if (keyNameLooksOpenAi(row.key) || looksLikeOpenAiSecret(value)) {
        if (!discoveredDbKeys.includes(row.key)) discoveredDbKeys.push(row.key);
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[openai] probe site_settings read failed:", msg);
  }

  return { siteSettings, env, discoveredDbKeys, allDbKeys, runtimeOpenAi };
}

/**
 * Resolve OpenAI API key the same way for ChatGPT status, image gen, and foto-normalize.
 *
 * Order (mirrors other integrations like Mollie via getRuntimeSetting, then aliases):
 * 1. Fresh runtime setting OPENAI_API_KEY — DB override > env (no React cache)
 * 2. site_settings for known candidate key names
 * 3. Fuzzy discovery: any site_settings row whose key looks OpenAI-related or value is sk-…
 * 4. process.env for candidate aliases
 */
export async function resolveOpenAiApiKey(): Promise<OpenAiApiKeyResolution> {
  // 1) Canonical runtime setting — always uncached so a save on the previous request is visible.
  try {
    const fromRuntime = (await getRuntimeSettingFresh("OPENAI_API_KEY")).trim();
    if (fromRuntime) {
      console.info(`[openai] API key from getRuntimeSettingFresh:OPENAI_API_KEY (…${fromRuntime.slice(-4)})`);
      return { key: fromRuntime, source: { kind: "runtime", keyName: "OPENAI_API_KEY" } };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[openai] getRuntimeSettingFresh(OPENAI_API_KEY) failed:", msg);
  }

  let dbValues = new Map<string, string>();
  let allRows: { key: string; value: string }[] = [];
  try {
    const prisma = requirePrisma();
    allRows = (
      await prisma.siteSetting.findMany({
        select: { key: true, value: true },
      })
    ).map((r) => ({ key: r.key, value: r.value?.trim() ?? "" }));
    dbValues = new Map(allRows.map((r) => [r.key, r.value]));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[openai] site_settings read failed:", msg);
  }

  // 2) Known candidate key names in DB
  for (const keyName of OPENAI_API_KEY_CANDIDATES) {
    const fromDb = dbValues.get(keyName)?.trim() ?? "";
    if (fromDb) {
      console.info(`[openai] API key from site_settings:${keyName} (…${fromDb.slice(-4)})`);
      return { key: fromDb, source: { kind: "database", keyName } };
    }
  }

  // 3) Fuzzy: key name looks OpenAI-ish, or value is an sk-… secret
  for (const row of allRows) {
    if (!row.value) continue;
    if (keyNameLooksOpenAi(row.key) || looksLikeOpenAiSecret(row.value)) {
      console.info(`[openai] API key from site_settings discovery:${row.key} (…${row.value.slice(-4)})`);
      return { key: row.value, source: { kind: "database", keyName: row.key } };
    }
  }

  // 4) Env aliases
  for (const keyName of OPENAI_API_KEY_CANDIDATES) {
    const fromEnv = process.env[keyName]?.trim() ?? "";
    if (fromEnv) {
      console.info(`[openai] API key from env:${keyName} (…${fromEnv.slice(-4)})`);
      return { key: fromEnv, source: { kind: "env", keyName } };
    }
  }

  const probe = await probeOpenAiApiKeySources();
  console.warn(
    "[openai] no API key: checked site_settings + env for",
    OPENAI_API_KEY_CANDIDATES.join(", "),
    "| runtimeOpenAi=",
    probe.runtimeOpenAi,
    "| siteSettings=",
    JSON.stringify(probe.siteSettings),
    "| env=",
    JSON.stringify(probe.env),
    "| discoveredDbKeys=",
    probe.discoveredDbKeys.join(",") || "(none)",
    "| allDbKeys=",
    probe.allDbKeys.join(",") || "(none)",
  );
  return { key: null, source: { kind: "none" } };
}

/**
 * OpenAI key: Admin → Instellingen → OpenAI (`OPENAI_API_KEY` in site_settings),
 * then env / alias keys. Always fresh DB read.
 */
export async function getOpenAiApiKey(): Promise<string | null> {
  const { key } = await resolveOpenAiApiKey();
  return key;
}

function sourceLabel(source: OpenAiApiKeySource): string {
  if (source.kind === "runtime") return `Instellingen/runtime (${source.keyName})`;
  if (source.kind === "database") return `Instellingen (${source.keyName})`;
  if (source.kind === "env") return `env (${source.keyName})`;
  return "unknown";
}

export async function getChatGptAdminStatus() {
  const { key, source } = await resolveOpenAiApiKey();
  if (!key) {
    const probe = await probeOpenAiApiKeySources();
    return {
      ok: false,
      label: "No API key",
      detail:
        "Zet OPENAI_API_KEY onder Instellingen → OpenAI, plak de sk-… key en klik Opslaan (of in .env.local).",
      source: source.kind,
      probe,
    };
  }
  return {
    ok: true,
    label: "Connected",
    secondaryLabel: `Key · …${key.slice(-4)}`,
    detail: `Bron: ${sourceLabel(source)}`,
    source: source.kind,
  };
}

export async function getAiImageAdminStatus() {
  const { key: openAiKey, source } = await resolveOpenAiApiKey();

  if (openAiKey) {
    return {
      ok: true,
      label: "Ready",
      provider: "openai" as const,
      secondaryLabel: `OpenAI · …${openAiKey.slice(-4)}`,
      detail: `Image generation via OpenAI — bron: ${sourceLabel(source)}`,
    };
  }

  const magnificKey = getMagnificApiKey();
  if (magnificKey) {
    return {
      ok: true,
      label: "Ready",
      provider: "magnific" as const,
      secondaryLabel: `Magnific API · …${magnificKey.slice(-4)}`,
      detail: "Image generation via Magnific (only used when OPENAI_API_KEY is unset)",
    };
  }

  const probe = await probeOpenAiApiKeySources();
  return {
    ok: false,
    label: "Not configured",
    provider: "none" as const,
    detail:
      "Zet OPENAI_API_KEY onder Instellingen → OpenAI, plak de sk-… key en klik Opslaan (of in .env.local).",
    probe,
  };
}

/** Admin-visible missing-key message with boolean probe (no secrets). */
export async function formatMissingOpenAiKeyError(): Promise<string> {
  const probe = await probeOpenAiApiKeySources();
  const settingsFlags = OPENAI_API_KEY_CANDIDATES.map(
    (k) => `${k}=${probe.siteSettings[k] ? "set" : "empty"}`,
  ).join(", ");
  const envFlags = OPENAI_API_KEY_CANDIDATES.map(
    (k) => `${k}=${probe.env[k] ? "set" : "empty"}`,
  ).join(", ");
  const discovered =
    probe.discoveredDbKeys.length > 0
      ? probe.discoveredDbKeys.join(", ")
      : "(geen)";
  return (
    "OPENAI_API_KEY ontbreekt. Bronnen (alleen of gevuld): " +
    `getRuntimeSetting=${probe.runtimeOpenAi ? "set" : "empty"}; ` +
    `site_settings[${settingsFlags}]; ` +
    `env[${envFlags}]; ` +
    `ontdekte DB-keys=${discovered}; ` +
    `alle DB-keys=${probe.allDbKeys.length ? probe.allDbKeys.join(", ") : "(geen)"}. ` +
    "Ga naar Admin → Instellingen → OpenAI, plak sk-…, klik Opslaan."
  );
}

/**
 * Live check against OpenAI without exposing the key.
 * Uses GET /v1/models — cheap auth probe.
 */
export async function testOpenAiConnection(): Promise<{
  ok: boolean;
  label: string;
  detail: string;
  source?: string;
}> {
  const { key, source } = await resolveOpenAiApiKey();
  if (!key) {
    const probe = await probeOpenAiApiKeySources();
    return {
      ok: false,
      label: "Geen key",
      detail:
        "Geen OPENAI_API_KEY in site_settings of env. Plak sk-… onder Instellingen → OpenAI en sla op. " +
        `DB-keys: ${probe.allDbKeys.length ? probe.allDbKeys.join(", ") : "(geen)"}.`,
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      return {
        ok: true,
        label: "Verbinding OK",
        detail: `OpenAI accepteert de key (bron: ${sourceLabel(source)}).`,
        source: source.kind,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        label: "Key geweigerd",
        detail:
          "OpenAI weigert de opgeslagen key (ongeldig of ingetrokken). Plak een nieuwe sk-… en sla opnieuw op.",
        source: source.kind,
      };
    }
    const body = await res.text().catch(() => "");
    const snippet = body.replace(/\s+/g, " ").slice(0, 120);
    return {
      ok: false,
      label: `HTTP ${res.status}`,
      detail: snippet
        ? `OpenAI antwoordde met status ${res.status}: ${snippet}`
        : `OpenAI antwoordde met status ${res.status}.`,
      source: source.kind,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      label: "Netwerkfout",
      detail: `Kon OpenAI niet bereiken: ${msg}`,
      source: source.kind,
    };
  }
}
