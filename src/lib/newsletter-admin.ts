import "server-only";

import { requirePrisma } from "@/lib/database";
import { EMAIL_LOGO_CID_SRC } from "@/lib/site-brand";
import {
  sendOutboundEmailResult,
  isOutboundEmailConfigured,
  verifyOutboundEmail,
} from "@/lib/outbound-email";
import {
  transactionalEmailSiteUrl,
  transactionalEmailTextFooter,
  wrapTransactionalEmailHtml,
} from "@/lib/transactional-email-layout";
import { htmlToPlainText } from "@/lib/email-template-render";
import {
  ensureNewsletterCoupon,
  sendNewsletterWelcomeEmail,
} from "@/lib/newsletter";
import {
  campaignStatusLabel,
  NEWSLETTER_CRON_PATH,
  NEWSLETTER_CRON_SCHEDULE,
  NEWSLETTER_CRON_SCHEDULE_LABEL,
  type NewsletterCampaignStatus,
  type NewsletterSubscriberStatus,
} from "@/lib/newsletter-shared";

export type { NewsletterCampaignStatus, NewsletterSubscriberStatus };
export {
  campaignStatusLabel,
  NEWSLETTER_CRON_PATH,
  NEWSLETTER_CRON_SCHEDULE,
  NEWSLETTER_CRON_SCHEDULE_LABEL,
};
export type NewsletterSubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  source: string;
  locale: string | null;
  couponCode: string | null;
  status: NewsletterSubscriberStatus;
  consentAt: Date;
  unsubscribedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type NewsletterCampaignRow = {
  id: string;
  subject: string;
  title: string | null;
  bodyHtml: string;
  status: NewsletterCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failCount: number;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeNewsletterCampaign(c: NewsletterCampaignRow) {
  return {
    ...c,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    sentAt: c.sentAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function serializeNewsletterSubscriber(s: NewsletterSubscriberRow) {
  return {
    ...s,
    consentAt: s.consentAt.toISOString(),
    unsubscribedAt: s.unsubscribedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function asSubscriberStatus(value: string): NewsletterSubscriberStatus {
  return value === "unsubscribed" ? "unsubscribed" : "active";
}

function asCampaignStatus(value: string): NewsletterCampaignStatus {
  if (
    value === "scheduled" ||
    value === "sending" ||
    value === "sent" ||
    value === "failed"
  ) {
    return value;
  }
  return "draft";
}

function mapSubscriber(row: {
  id: string;
  email: string;
  name: string | null;
  source: string;
  locale: string | null;
  couponCode: string | null;
  status: string;
  consentAt: Date;
  unsubscribedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): NewsletterSubscriberRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    source: row.source,
    locale: row.locale,
    couponCode: row.couponCode,
    status: asSubscriberStatus(row.status),
    consentAt: row.consentAt,
    unsubscribedAt: row.unsubscribedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCampaign(row: {
  id: string;
  subject: string;
  title: string | null;
  bodyHtml: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failCount: number;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): NewsletterCampaignRow {
  return {
    id: row.id,
    subject: row.subject,
    title: row.title,
    bodyHtml: row.bodyHtml,
    status: asCampaignStatus(row.status),
    recipientCount: row.recipientCount,
    sentCount: row.sentCount,
    failCount: row.failCount,
    scheduledAt: row.scheduledAt,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listNewsletterSubscribers(opts?: {
  q?: string;
  status?: NewsletterSubscriberStatus | "all";
  limit?: number;
}): Promise<NewsletterSubscriberRow[]> {
  const prisma = requirePrisma();
  const q = opts?.q?.trim().toLowerCase() ?? "";
  const status = opts?.status ?? "all";
  const limit = Math.min(Math.max(opts?.limit ?? 500, 1), 5000);

  const rows = await prisma.newsletterSubscriber.findMany({
    where: {
      ...(status !== "all" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { source: { contains: q, mode: "insensitive" } },
              { locale: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(mapSubscriber);
}

export type AdminAddSubscriberResult =
  | {
      ok: true;
      subscriber: NewsletterSubscriberRow;
      created: boolean;
      reactivated: boolean;
      welcomeSent: boolean;
    }
  | { ok: false; error: string };

/** Manual admin upsert: create / reactivate; welcome promo only when opted in. */
export async function adminAddNewsletterSubscriber(input: {
  email: string;
  name?: string;
  locale?: string;
  source?: string;
  sendWelcome?: boolean;
}): Promise<AdminAddSubscriberResult> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || email.length < 5) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }

  const prisma = requirePrisma();
  const promo = await ensureNewsletterCoupon();
  const name = input.name?.trim().slice(0, 120) || null;
  const locale = input.locale?.trim().slice(0, 12) || null;
  const source = (input.source?.trim() || "admin").slice(0, 40);
  const now = new Date();

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  let created = false;
  let reactivated = false;
  let row;

  if (existing) {
    reactivated = existing.status === "unsubscribed";
    row = await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: {
        status: "active",
        unsubscribedAt: null,
        ...(reactivated ? { consentAt: now } : {}),
        name: name ?? existing.name,
        locale: locale ?? existing.locale,
        source,
        couponCode: existing.couponCode || promo.code,
      },
    });
  } else {
    created = true;
    row = await prisma.newsletterSubscriber.create({
      data: {
        email,
        name,
        source,
        locale,
        couponCode: promo.code,
        status: "active",
        consentAt: now,
      },
    });
  }

  const welcomeSent =
    Boolean(input.sendWelcome) && (created || reactivated)
      ? await sendNewsletterWelcomeEmail(email, promo.code)
      : false;

  return {
    ok: true,
    subscriber: mapSubscriber(row),
    created,
    reactivated,
    welcomeSent,
  };
}

export async function setNewsletterSubscriberStatus(
  id: string,
  status: NewsletterSubscriberStatus,
): Promise<NewsletterSubscriberRow | null> {
  const prisma = requirePrisma();
  try {
    const row = await prisma.newsletterSubscriber.update({
      where: { id },
      data: {
        status,
        unsubscribedAt: status === "unsubscribed" ? new Date() : null,
      },
    });
    return mapSubscriber(row);
  } catch {
    return null;
  }
}

export async function deleteNewsletterSubscriber(id: string): Promise<boolean> {
  const prisma = requirePrisma();
  try {
    await prisma.newsletterSubscriber.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export function newsletterSubscribersToCsv(rows: NewsletterSubscriberRow[]): string {
  const header = [
    "email",
    "name",
    "status",
    "source",
    "locale",
    "coupon_code",
    "consent_at",
    "unsubscribed_at",
    "created_at",
  ];
  const escape = (value: string | null | undefined) => {
    const s = value ?? "";
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [
    header.join(","),
    ...rows.map((r) =>
      [
        escape(r.email),
        escape(r.name),
        escape(r.status),
        escape(r.source),
        escape(r.locale),
        escape(r.couponCode),
        escape(r.consentAt.toISOString()),
        escape(r.unsubscribedAt?.toISOString() ?? ""),
        escape(r.createdAt.toISOString()),
      ].join(","),
    ),
  ].join("\n");
}

export async function listNewsletterCampaigns(limit = 50): Promise<NewsletterCampaignRow[]> {
  const prisma = requirePrisma();
  const rows = await prisma.newsletterCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(mapCampaign);
}

export async function getNewsletterCampaign(id: string): Promise<NewsletterCampaignRow | null> {
  const prisma = requirePrisma();
  const row = await prisma.newsletterCampaign.findUnique({ where: { id } });
  return row ? mapCampaign(row) : null;
}

export async function createNewsletterCampaign(input: {
  subject: string;
  title?: string;
  bodyHtml: string;
  scheduledAt?: Date | null;
}): Promise<NewsletterCampaignRow> {
  const subject = input.subject.trim();
  const bodyHtml = input.bodyHtml.trim();
  if (!subject) throw new Error("Onderwerp is verplicht.");
  if (!bodyHtml) throw new Error("Inhoud is verplicht.");

  const scheduledAt = input.scheduledAt ?? null;
  if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
    throw new Error("Plan-tijd moet in de toekomst liggen.");
  }

  const prisma = requirePrisma();
  const row = await prisma.newsletterCampaign.create({
    data: {
      subject: subject.slice(0, 200),
      title: input.title?.trim().slice(0, 200) || null,
      bodyHtml,
      status: scheduledAt ? "scheduled" : "draft",
      scheduledAt,
    },
  });
  return mapCampaign(row);
}

export async function updateNewsletterCampaign(
  id: string,
  input: {
    subject?: string;
    title?: string | null;
    bodyHtml?: string;
    scheduledAt?: Date | null;
    clearSchedule?: boolean;
  },
): Promise<NewsletterCampaignRow | null> {
  const prisma = requirePrisma();
  const existing = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.status === "sending") {
    throw new Error("Campagne wordt al verstuurd.");
  }
  const subject = input.subject?.trim();
  const bodyHtml = input.bodyHtml?.trim();
  if (subject !== undefined && !subject) throw new Error("Onderwerp is verplicht.");
  if (bodyHtml !== undefined && !bodyHtml) throw new Error("Inhoud is verplicht.");

  let nextScheduledAt: Date | null | undefined = undefined;
  let nextStatus: NewsletterCampaignStatus | undefined = undefined;

  if (input.clearSchedule) {
    nextScheduledAt = null;
    if (existing.status === "scheduled") nextStatus = "draft";
  } else if (input.scheduledAt !== undefined) {
    if (input.scheduledAt === null) {
      nextScheduledAt = null;
      if (existing.status === "scheduled") nextStatus = "draft";
    } else {
      if (input.scheduledAt.getTime() <= Date.now()) {
        throw new Error("Plan-tijd moet in de toekomst liggen.");
      }
      nextScheduledAt = input.scheduledAt;
      if (existing.status === "draft" || existing.status === "scheduled" || existing.status === "failed") {
        nextStatus = "scheduled";
      } else if (existing.status === "sent") {
        throw new Error("Verstuurde campagnes kunnen niet opnieuw worden gepland. Dupliceer eerst.");
      }
    }
  }

  const row = await prisma.newsletterCampaign.update({
    where: { id },
    data: {
      ...(subject !== undefined ? { subject: subject.slice(0, 200) } : {}),
      ...(input.title !== undefined
        ? { title: input.title?.trim().slice(0, 200) || null }
        : {}),
      ...(bodyHtml !== undefined ? { bodyHtml } : {}),
      ...(nextScheduledAt !== undefined ? { scheduledAt: nextScheduledAt } : {}),
      ...(nextStatus
        ? { status: nextStatus }
        : existing.status === "sent" || existing.status === "failed"
          ? { status: "draft", scheduledAt: null }
          : {}),
    },
  });
  return mapCampaign(row);
}

export async function scheduleNewsletterCampaign(
  id: string,
  scheduledAt: Date,
): Promise<NewsletterCampaignRow | null> {
  return updateNewsletterCampaign(id, { scheduledAt });
}

export async function cancelNewsletterCampaignSchedule(
  id: string,
): Promise<NewsletterCampaignRow | null> {
  return updateNewsletterCampaign(id, { clearSchedule: true });
}

export async function duplicateNewsletterCampaign(
  id: string,
): Promise<NewsletterCampaignRow | null> {
  const existing = await getNewsletterCampaign(id);
  if (!existing) return null;
  return createNewsletterCampaign({
    subject: existing.subject.startsWith("Kopie: ")
      ? existing.subject
      : `Kopie: ${existing.subject}`.slice(0, 200),
    title: existing.title ?? undefined,
    bodyHtml: existing.bodyHtml,
  });
}

export async function deleteNewsletterCampaign(id: string): Promise<boolean> {
  const prisma = requirePrisma();
  const existing = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!existing) return false;
  if (existing.status === "sending") {
    throw new Error("Campagne wordt al verstuurd.");
  }
  await prisma.newsletterCampaign.delete({ where: { id } });
  return true;
}

export type SendCampaignResult = {
  ok: boolean;
  campaign: NewsletterCampaignRow;
  error?: string;
};

export async function sendNewsletterCampaign(id: string): Promise<SendCampaignResult> {
  const prisma = requirePrisma();
  if (!(await isOutboundEmailConfigured())) {
    const existing = await getNewsletterCampaign(id);
    if (!existing) throw new Error("Campagne niet gevonden.");
    return {
      ok: false,
      campaign: existing,
      error:
        "E-mail is niet geconfigureerd. Vul SMTP host, gebruiker en wachtwoord in onder Admin → Instellingen → Verzenden.",
    };
  }

  const campaign = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!campaign) {
    throw new Error("Campagne niet gevonden.");
  }
  if (campaign.status === "sending") {
    return { ok: false, campaign: mapCampaign(campaign), error: "Campagne wordt al verstuurd." };
  }
  if (!campaign.subject.trim() || !campaign.bodyHtml.trim()) {
    return { ok: false, campaign: mapCampaign(campaign), error: "Onderwerp en inhoud zijn verplicht." };
  }

  const recipients = await prisma.newsletterSubscriber.findMany({
    where: { status: "active" },
    select: { email: true },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });

  if (recipients.length === 0) {
    return {
      ok: false,
      campaign: mapCampaign(campaign),
      error: "Geen actieve abonnees om te mailen.",
    };
  }

  // Fail fast on SMTP AUTH / connection before marking the campaign as sending.
  const verified = await verifyOutboundEmail();
  if (!verified.ok) {
    return {
      ok: false,
      campaign: mapCampaign(campaign),
      error: verified.error,
    };
  }

  await prisma.newsletterCampaign.update({
    where: { id },
    data: {
      status: "sending",
      scheduledAt: null,
      recipientCount: recipients.length,
      sentCount: 0,
      failCount: 0,
    },
  });

  // Inline CID: smtp-email attaches public/bergasports-logo.png (localhost/www 404-safe).
  const logoUrl = EMAIL_LOGO_CID_SRC;
  const siteUrl = transactionalEmailSiteUrl();
  const title = campaign.title?.trim() || campaign.subject.trim();
  // `newsletter` variant: marketing unsubscribe footer + richer campaign chrome.
  const html = wrapTransactionalEmailHtml({
    title,
    preheader: campaign.subject,
    innerHtml: campaign.bodyHtml,
    siteUrl,
    logoUrl,
    variant: "newsletter",
    locale: "nl",
  });
  const text = `${title}\n\n${htmlToPlainText(campaign.bodyHtml)}\n\n${transactionalEmailTextFooter(siteUrl, "nl", "newsletter")}`;

  let sentCount = 0;
  let failCount = 0;
  let lastError: string | undefined;

  for (const { email } of recipients) {
    const result = await sendOutboundEmailResult({
      to: email,
      subject: campaign.subject,
      text,
      html,
    });
    if (result.ok) sentCount += 1;
    else {
      failCount += 1;
      lastError = result.error;
    }
  }

  const finalStatus: NewsletterCampaignStatus = sentCount === 0 ? "failed" : "sent";

  const updated = await prisma.newsletterCampaign.update({
    where: { id },
    data: {
      status: finalStatus,
      sentCount,
      failCount,
      recipientCount: recipients.length,
      sentAt: new Date(),
      scheduledAt: null,
    },
  });

  return {
    ok: sentCount > 0,
    campaign: mapCampaign(updated),
    error:
      sentCount === 0
        ? lastError ??
          "Geen e-mails verstuurd. Controleer SMTP onder Admin → Instellingen → Verzenden."
        : failCount > 0
          ? `${sentCount} verstuurd, ${failCount} mislukt.${lastError ? ` ${lastError}` : ""}`
          : undefined,
  };
}

export type NewsletterCronRunResult = {
  ok: boolean;
  due: number;
  sent: number;
  failed: number;
  results: Array<{ id: string; ok: boolean; error?: string }>;
  reason?: string;
};

/** Send all campaigns with status=scheduled and scheduled_at <= now. */
export async function runNewsletterScheduledCron(): Promise<NewsletterCronRunResult> {
  if (!(await isOutboundEmailConfigured())) {
    return {
      ok: false,
      due: 0,
      sent: 0,
      failed: 0,
      results: [],
      reason: "email_not_configured",
    };
  }

  const prisma = requirePrisma();
  const due = await prisma.newsletterCampaign.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  const results: NewsletterCronRunResult["results"] = [];
  let sent = 0;
  let failed = 0;

  for (const campaign of due) {
    try {
      const result = await sendNewsletterCampaign(campaign.id);
      results.push({
        id: campaign.id,
        ok: result.ok,
        error: result.error,
      });
      if (result.ok) sent += 1;
      else failed += 1;
    } catch (e) {
      failed += 1;
      results.push({
        id: campaign.id,
        ok: false,
        error: e instanceof Error ? e.message : "send_failed",
      });
    }
  }

  return {
    ok: true,
    due: due.length,
    sent,
    failed,
    results,
  };
}
