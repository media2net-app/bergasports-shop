import "server-only";

import { isTikTokEventsApiConfigured, TIKTOK_PIXEL_ID } from "@/lib/tiktok-events-api";

export type TikTokAdminStatus = {
  ok: boolean;
  label: string;
  detail?: string;
  secondaryLabel?: string;
  pixelConfigured: boolean;
  eventsApiConfigured: boolean;
};

export function getTikTokAdminStatus(): TikTokAdminStatus {
  const pixelConfigured = Boolean(TIKTOK_PIXEL_ID);
  const eventsApiConfigured = isTikTokEventsApiConfigured();

  if (!pixelConfigured) {
    return {
      ok: false,
      label: "Not configured",
      detail: "Set NEXT_PUBLIC_TIKTOK_PIXEL_ID on the server",
      pixelConfigured: false,
      eventsApiConfigured: false,
    };
  }

  const suffix = TIKTOK_PIXEL_ID.slice(-4);

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
