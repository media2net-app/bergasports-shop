import "server-only";

import { isTikTokEventsApiConfigured } from "@/lib/tiktok-events-api";
import { getRuntimeSetting } from "@/lib/site-settings-db";

export type TikTokAdminStatus = {
  ok: boolean;
  label: string;
  detail?: string;
  secondaryLabel?: string;
  pixelConfigured: boolean;
  eventsApiConfigured: boolean;
};

export async function getTikTokAdminStatus(): Promise<TikTokAdminStatus> {
  const [pixelId, eventsApiConfigured] = await Promise.all([
    getRuntimeSetting("NEXT_PUBLIC_TIKTOK_PIXEL_ID"),
    isTikTokEventsApiConfigured(),
  ]);
  const pixelConfigured = Boolean(pixelId.trim() || process.env.TIKTOK_PIXEL_ID?.trim());

  if (!pixelConfigured) {
    return {
      ok: false,
      label: "Not configured",
      detail: "Zet TikTok Pixel ID onder Instellingen → Pixels",
      pixelConfigured: false,
      eventsApiConfigured: false,
    };
  }

  const suffix = (pixelId.trim() || process.env.TIKTOK_PIXEL_ID?.trim() || "").slice(-4);

  return {
    ok: true,
    label: "Active",
    pixelConfigured: true,
    eventsApiConfigured,
    secondaryLabel: eventsApiConfigured
      ? `Events API · …${suffix}`
      : `Pixel · …${suffix} · Events API not set`,
  };
}
