"use client";

import { TIKTOK_TTCLID_COOKIE } from "@/lib/tiktok-attribution";

export function getTtclidFromDocument(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TIKTOK_TTCLID_COOKIE}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
