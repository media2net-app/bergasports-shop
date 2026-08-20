import "server-only";

import { getMagnificApiKey } from "@/lib/magnific-api-key";
import { requirePrisma } from "@/lib/database";

/** Candidate setting / env names, in priority order (same for status + image + normalize). */
export const OPENAI_API_KEY_CANDIDATES = [
  "OPENAI_API_KEY",
  "CHATGPT_API_KEY",
  "AI_IMAGE_API_KEY",
] as const;

export type OpenAiApiKeySource =
  | { kind: "database"; keyName: (typeof OPENAI_API_KEY_CANDIDATES)[number] }
  | { kind: "env"; keyName: (typeof OPENAI_API_KEY_CANDIDATES)[number] }
  | { kind: "none" };

export type OpenAiApiKeyResolution = {
  key: string | null;
  source: OpenAiApiKeySource;
};

/**
 * Resolve OpenAI API key the same way for ChatGPT status, image gen, and foto-normalize.
 * Reads site_settings directly (not React cache) so a just-saved Instellingen value is found,
 * then falls back to process.env aliases.
 */
export async function resolveOpenAiApiKey(): Promise<OpenAiApiKeyResolution> {
  let dbValues = new Map<string, string>();
  try {
    const prisma = requirePrisma();
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [...OPENAI_API_KEY_CANDIDATES] } },
      select: { key: true, value: true },
    });
    dbValues = new Map(rows.map((r) => [r.key, r.value?.trim() ?? ""]));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[openai] site_settings read failed:", msg);
  }

  for (const keyName of OPENAI_API_KEY_CANDIDATES) {
    const fromDb = dbValues.get(keyName)?.trim() ?? "";
    if (fromDb) {
      console.info(`[openai] API key from site_settings:${keyName} (…${fromDb.slice(-4)})`);
      return { key: fromDb, source: { kind: "database", keyName } };
    }
  }

  for (const keyName of OPENAI_API_KEY_CANDIDATES) {
    const fromEnv = process.env[keyName]?.trim() ?? "";
    if (fromEnv) {
      console.info(`[openai] API key from env:${keyName} (…${fromEnv.slice(-4)})`);
      return { key: fromEnv, source: { kind: "env", keyName } };
    }
  }

  console.warn(
    "[openai] no API key: checked site_settings + env for",
    OPENAI_API_KEY_CANDIDATES.join(", "),
  );
  return { key: null, source: { kind: "none" } };
}

/**
 * OpenAI key: Admin → Instellingen → OpenAI (`OPENAI_API_KEY` in site_settings),
 * then env (`OPENAI_API_KEY` / `CHATGPT_API_KEY` / `AI_IMAGE_API_KEY`).
 */
export async function getOpenAiApiKey(): Promise<string | null> {
  const { key } = await resolveOpenAiApiKey();
  return key;
}

export async function getChatGptAdminStatus() {
  const { key, source } = await resolveOpenAiApiKey();
  if (!key) {
    return {
      ok: false,
      label: "No API key",
      detail:
        "Zet OPENAI_API_KEY onder Instellingen → OpenAI, plak de sk-… key en klik Opslaan (of in .env.local).",
      source: source.kind,
    };
  }
  const where =
    source.kind === "database"
      ? `Instellingen (${source.keyName})`
      : source.kind === "env"
        ? `env (${source.keyName})`
        : "unknown";
  return {
    ok: true,
    label: "Connected",
    secondaryLabel: `Key · …${key.slice(-4)}`,
    detail: `Bron: ${where}`,
    source: source.kind,
  };
}

export async function getAiImageAdminStatus() {
  const { key: openAiKey, source } = await resolveOpenAiApiKey();

  if (openAiKey) {
    const where =
      source.kind === "database"
        ? `Instellingen (${source.keyName})`
        : source.kind === "env"
          ? `env (${source.keyName})`
          : "unknown";
    return {
      ok: true,
      label: "Ready",
      provider: "openai" as const,
      secondaryLabel: `OpenAI · …${openAiKey.slice(-4)}`,
      detail: `Image generation via OpenAI — bron: ${where}`,
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

  return {
    ok: false,
    label: "Not configured",
    provider: "none" as const,
    detail:
      "Zet OPENAI_API_KEY onder Instellingen → OpenAI, plak de sk-… key en klik Opslaan (of in .env.local).",
  };
}
