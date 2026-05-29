import "server-only";

import {
  getLastWinbackCronRun,
  WINBACK_CRON_SCHEDULE_LABEL,
} from "@/lib/marketing-winback-cron";
import { isOutboundEmailConfigured } from "@/lib/outbound-email";

export type CronAdminStatus = {
  ok: boolean;
  label: string;
  detail?: string;
  secondaryLabel?: string;
};

const STALE_AFTER_HOURS = 36;

function formatCronTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export async function getCronAdminStatus(): Promise<CronAdminStatus> {
  const secretConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const emailConfigured = isOutboundEmailConfigured();
  const { lastRun, logAvailable } = await getLastWinbackCronRun();

  if (!secretConfigured) {
    return {
      ok: false,
      label: "CRON_SECRET missing",
      detail: "Required on Vercel Production",
      secondaryLabel: WINBACK_CRON_SCHEDULE_LABEL,
    };
  }

  if (!emailConfigured) {
    return {
      ok: false,
      label: "Email not configured",
      detail: "Win-back cron cannot send mail",
      secondaryLabel: WINBACK_CRON_SCHEDULE_LABEL,
    };
  }

  if (!lastRun) {
    return {
      ok: true,
      label: logAvailable ? "Scheduled" : "Ready",
      detail: logAvailable ? undefined : "Run log table unavailable",
      secondaryLabel: WINBACK_CRON_SCHEDULE_LABEL,
    };
  }

  const hoursSinceRun = (Date.now() - new Date(lastRun.ranAt).getTime()) / 3_600_000;

  if (!lastRun.ok) {
    return {
      ok: false,
      label: "Last run failed",
      detail: lastRun.detail ?? "Check marketing cron log",
      secondaryLabel: formatCronTime(lastRun.ranAt),
    };
  }

  if (hoursSinceRun > STALE_AFTER_HOURS) {
    return {
      ok: false,
      label: "Stale",
      detail: `Last success ${Math.round(hoursSinceRun)}h ago`,
      secondaryLabel: WINBACK_CRON_SCHEDULE_LABEL,
    };
  }

  return {
    ok: true,
    label: "Active",
    secondaryLabel: `Win-back · ${formatCronTime(lastRun.ranAt)} · ${lastRun.sent} sent`,
  };
}
