import "server-only";

import { requirePrisma } from "@/lib/database";
import type { OrderWithItems } from "@/lib/orders";
import { sendOutboundEmail, isOutboundEmailConfigured } from "@/lib/outbound-email";
import {
  buildPostPurchaseEmailParts,
  buildWelcomeEmailParts,
  buildWinBackEmailParts,
  type MarketingEmailKind,
} from "@/lib/transactional-marketing-emails";

async function wasMarketingEmailSent(
  email: string,
  kind: MarketingEmailKind,
  orderId?: number,
): Promise<boolean> {
  const prisma = requirePrisma();
  const normalized = email.trim().toLowerCase();
  const where =
    kind === "post_purchase" && orderId != null
      ? { email: normalized, kind, orderId: BigInt(orderId) }
      : { email: normalized, kind };
  const count = await prisma.marketingEmailLog.count({ where });
  return count > 0;
}

async function logMarketingEmail(
  email: string,
  kind: MarketingEmailKind,
  orderId?: number,
): Promise<void> {
  const prisma = requirePrisma();
  await prisma.marketingEmailLog.create({
    data: {
      email: email.trim().toLowerCase(),
      kind,
      orderId: orderId != null ? BigInt(orderId) : null,
    },
  });
}

export async function countPriorOrdersForEmail(email: string, excludeOrderId?: number): Promise<number> {
  const prisma = requirePrisma();
  const normalized = email.trim().toLowerCase();
  return prisma.order.count({
    where: {
      customerEmail: { equals: normalized, mode: "insensitive" },
      status: { not: "cancelled" },
      ...(excludeOrderId != null ? { id: { not: BigInt(excludeOrderId) } } : {}),
    },
  });
}

export async function sendWelcomeMarketingEmail(
  customerName: string,
  email: string,
  orderId?: number,
): Promise<boolean> {
  if (!isOutboundEmailConfigured()) {
    return false;
  }
  const to = email.trim();
  if (!to) {
    return false;
  }
  if (await wasMarketingEmailSent(to, "welcome", orderId)) {
    return false;
  }
  const prior = await countPriorOrdersForEmail(to, orderId);
  if (prior > 0) {
    return false;
  }

  const { subject, text, html } = buildWelcomeEmailParts(customerName.trim() || "client");
  const ok = await sendOutboundEmail({ to, subject, text, html });
  if (ok) {
    await logMarketingEmail(to, "welcome", orderId);
  }
  return ok;
}

export async function sendPostPurchaseMarketingEmail(order: OrderWithItems): Promise<boolean> {
  if (!isOutboundEmailConfigured()) {
    return false;
  }
  const to = order.customer_email?.trim();
  if (!to) {
    return false;
  }
  if (await wasMarketingEmailSent(to, "post_purchase", order.id)) {
    return false;
  }

  const { subject, text, html } = buildPostPurchaseEmailParts(order);
  const ok = await sendOutboundEmail({ to, subject, text, html });
  if (ok) {
    await logMarketingEmail(to, "post_purchase", order.id);
  }
  return ok;
}

export async function sendWinBackMarketingEmail(
  customerName: string,
  email: string,
): Promise<boolean> {
  if (!isOutboundEmailConfigured()) {
    return false;
  }
  const to = email.trim();
  if (!to) {
    return false;
  }

  const prisma = requirePrisma();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const recent = await prisma.marketingEmailLog.count({
    where: {
      email: to.toLowerCase(),
      kind: "win_back",
      sentAt: { gte: cutoff },
    },
  });
  if (recent > 0) {
    return false;
  }

  const { subject, text, html } = buildWinBackEmailParts(customerName.trim() || "client");
  const ok = await sendOutboundEmail({ to, subject, text, html });
  if (ok) {
    await logMarketingEmail(to, "win_back");
  }
  return ok;
}

export type WinBackCandidate = {
  email: string;
  customerName: string;
  lastOrderAt: string;
};

export async function listWinBackCandidates(minDays = 60, limit = 40): Promise<WinBackCandidate[]> {
  const prisma = requirePrisma();
  const rows = await prisma.order.findMany({
    where: {
      customerEmail: { not: null },
      marketingConsent: true,
      status: { not: "cancelled" },
    },
    select: { customerEmail: true, customerName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const cutoffMs = Date.now() - minDays * 24 * 60 * 60 * 1000;
  const byEmail = new Map<string, WinBackCandidate>();

  for (const row of rows) {
    const email = (row.customerEmail ?? "").trim().toLowerCase();
    if (!email || byEmail.has(email)) {
      continue;
    }
    const createdAt = row.createdAt.toISOString();
    if (row.createdAt.getTime() > cutoffMs) {
      continue;
    }
    byEmail.set(email, {
      email,
      customerName: row.customerName,
      lastOrderAt: createdAt,
    });
    if (byEmail.size >= limit) {
      break;
    }
  }

  return [...byEmail.values()];
}
