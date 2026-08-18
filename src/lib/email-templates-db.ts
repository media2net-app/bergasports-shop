import "server-only";

import { sanitizeAdminHtml } from "@/lib/admin-html";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_KEYS,
  isEmailTemplateKey,
  type EmailTemplateDraft,
  type EmailTemplateKey,
} from "@/lib/email-template-defs";
import { hydrateEmailTranslations } from "@/lib/i18n/hydrate";
import { compactLocaleMap } from "@/lib/i18n/translations";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale-codes";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export type EmailTemplateRow = EmailTemplateDraft & {
  updatedAt: Date | null;
};

function prismaClient() {
  return getPrisma();
}

function fromRow(row: {
  key: string;
  category: string;
  name: string;
  description: string | null;
  subject: string;
  title: string;
  bodyHtml: string;
  updatedAt: Date;
  translations?: unknown;
}): EmailTemplateRow | null {
  if (!isEmailTemplateKey(row.key)) return null;
  return {
    key: row.key,
    category: DEFAULT_EMAIL_TEMPLATES[row.key].category,
    name: row.name,
    description: row.description ?? DEFAULT_EMAIL_TEMPLATES[row.key].description,
    subject: row.subject,
    title: row.title,
    bodyHtml: row.bodyHtml,
    updatedAt: row.updatedAt,
    translations: hydrateEmailTranslations(row),
  };
}

export async function ensureEmailTemplates(): Promise<void> {
  const prisma = prismaClient();
  if (!prisma) return;
  try {
    const existing = await prisma.emailTemplate.findMany({ select: { key: true } });
    const have = new Set(existing.map((row) => row.key));
    const missing = EMAIL_TEMPLATE_KEYS.filter((key) => !have.has(key));
    if (!missing.length) return;
    await prisma.emailTemplate.createMany({
      data: missing.map((key) => {
        const def = DEFAULT_EMAIL_TEMPLATES[key];
        return {
          key: def.key,
          category: def.category,
          name: def.name,
          description: def.description,
          subject: def.subject,
          title: def.title,
          bodyHtml: def.bodyHtml,
        };
      }),
    });
  } catch {
    // Table may not exist yet.
  }
}

export async function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  await ensureEmailTemplates();
  const prisma = prismaClient();
  const byKey = new Map<EmailTemplateKey, EmailTemplateRow>();
  for (const key of EMAIL_TEMPLATE_KEYS) {
    const def = DEFAULT_EMAIL_TEMPLATES[key];
    byKey.set(key, { ...def, updatedAt: null });
  }
  if (prisma) {
    try {
      const rows = await prisma.emailTemplate.findMany();
      for (const row of rows) {
        const mapped = fromRow(row);
        if (mapped) byKey.set(mapped.key, mapped);
      }
    } catch {
      // fall back to defaults
    }
  }
  return EMAIL_TEMPLATE_KEYS.map((key) => byKey.get(key)!);
}

export async function getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplateRow> {
  const prisma = prismaClient();
  if (prisma) {
    try {
      const row = await prisma.emailTemplate.findUnique({ where: { key } });
      const mapped = row ? fromRow(row) : null;
      if (mapped) return mapped;
    } catch {
      // fall back
    }
  }
  return { ...DEFAULT_EMAIL_TEMPLATES[key], updatedAt: null };
}

export async function saveEmailTemplate(
  key: EmailTemplateKey,
  input: { subject: string; title: string; bodyHtml: string; translations?: EmailTemplateDraft["translations"] },
): Promise<EmailTemplateRow> {
  const prisma = prismaClient();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  const def = DEFAULT_EMAIL_TEMPLATES[key];
  const translations = compactLocaleMap(
    hydrateEmailTranslations({
      subject: input.subject,
      title: input.title,
      bodyHtml: input.bodyHtml,
      translations: input.translations,
    }),
  );
  const nl = translations[DEFAULT_LOCALE] ?? {};
  const subject = (nl.subject || input.subject).trim();
  const title = (nl.title || input.title).trim();
  const bodyHtml = sanitizeAdminHtml(nl.bodyHtml || input.bodyHtml);
  if (!subject || !title || !bodyHtml.trim()) {
    throw new Error("Onderwerp, titel en inhoud zijn verplicht.");
  }
  const row = await prisma.emailTemplate.upsert({
    where: { key },
    create: {
      key,
      category: def.category,
      name: def.name,
      description: def.description,
      subject,
      title,
      bodyHtml,
      translations: translations as Prisma.InputJsonValue,
    },
    update: {
      subject,
      title,
      bodyHtml,
      name: def.name,
      description: def.description,
      category: def.category,
      translations: translations as Prisma.InputJsonValue,
    },
  });
  return fromRow(row) ?? { ...def, subject, title, bodyHtml, updatedAt: row.updatedAt };
}

export async function resetEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplateRow> {
  const def = DEFAULT_EMAIL_TEMPLATES[key];
  const prisma = prismaClient();
  if (!prisma) throw new Error("DATABASE_URL ontbreekt");
  const row = await prisma.emailTemplate.upsert({
    where: { key },
    create: {
      key,
      category: def.category,
      name: def.name,
      description: def.description,
      subject: def.subject,
      title: def.title,
      bodyHtml: def.bodyHtml,
    },
    update: {
      subject: def.subject,
      title: def.title,
      bodyHtml: def.bodyHtml,
      name: def.name,
      description: def.description,
      category: def.category,
    },
  });
  return fromRow(row) ?? { ...def, updatedAt: row.updatedAt };
}
