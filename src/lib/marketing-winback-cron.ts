import "server-only";

import { requirePrisma } from "@/lib/database";
import { listWinBackCandidates, sendWinBackMarketingEmail } from "@/lib/marketing-email";
import { isOutboundEmailConfigured } from "@/lib/outbound-email";

export const WINBACK_CRON_SCHEDULE = "0 8 * * *";
export const WINBACK_CRON_SCHEDULE_LABEL = "Daily at 08:00 UTC (10:00 RO summer)";
export const WINBACK_CRON_PATH = "/api/cron/marketing-winback";

export type WinbackCronRunResult = {
  ok: boolean;
  candidates: number;
  sent: number;
  reason?: string;
};

export type WinbackCronLastRun = {
  ranAt: string;
  candidates: number;
  sent: number;
  ok: boolean;
  detail: string | null;
};

async function logCronRun(result: WinbackCronRunResult): Promise<void> {
  const prisma = requirePrisma();
  await prisma.marketingCronRun.create({
    data: {
      job: "win_back",
      candidates: result.candidates,
      sent: result.sent,
      ok: result.ok,
      detail: result.reason ?? null,
    },
  });
}

export async function runMarketingWinbackCron(): Promise<WinbackCronRunResult> {
  if (!(await isOutboundEmailConfigured())) {
    const result: WinbackCronRunResult = {
      ok: false,
      candidates: 0,
      sent: 0,
      reason: "email_not_configured",
    };
    await logCronRun(result);
    return result;
  }

  const candidates = await listWinBackCandidates(60, 30);
  let sent = 0;
  for (const row of candidates) {
    const ok = await sendWinBackMarketingEmail(row.customerName, row.email);
    if (ok) {
      sent += 1;
    }
  }

  const result: WinbackCronRunResult = {
    ok: true,
    candidates: candidates.length,
    sent,
  };
  await logCronRun(result);
  return result;
}

export async function getLastWinbackCronRun(): Promise<{
  lastRun: WinbackCronLastRun | null;
  logAvailable: boolean;
}> {
  const prisma = requirePrisma();
  const data = await prisma.marketingCronRun.findFirst({
    where: { job: "win_back" },
    orderBy: { ranAt: "desc" },
  });

  if (!data) {
    return { lastRun: null, logAvailable: true };
  }

  return {
    logAvailable: true,
    lastRun: {
      ranAt: data.ranAt.toISOString(),
      candidates: data.candidates,
      sent: data.sent,
      ok: data.ok,
      detail: data.detail,
    },
  };
}
