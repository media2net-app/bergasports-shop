import "server-only";

import { getMagnificApiKey } from "@/lib/magnific-api-key";

export function getOpenAiApiKey(): string | null {
  return (
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.CHATGPT_API_KEY?.trim() ||
    null
  );
}

export function getChatGptAdminStatus() {
  const key = getOpenAiApiKey();
  if (!key) {
    return {
      ok: false,
      label: "No API key",
      detail: "Set OPENAI_API_KEY on the server (Vercel → Environment Variables)",
    };
  }
  return {
    ok: true,
    label: "Connected",
    secondaryLabel: `Key · …${key.slice(-4)}`,
  };
}

export function getAiImageAdminStatus() {
  const openAiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.AI_IMAGE_API_KEY?.trim() ||
    process.env.CHATGPT_API_KEY?.trim() ||
    null;

  if (openAiKey) {
    return {
      ok: true,
      label: "Ready",
      provider: "openai" as const,
      secondaryLabel: `OpenAI · …${openAiKey.slice(-4)}`,
      detail: "Image generation via OpenAI (gpt-image-1)",
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
    detail: "Set OPENAI_API_KEY in .env.local",
  };
}
