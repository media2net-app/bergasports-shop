import "server-only";

import { getPrisma } from "@/lib/prisma";
import { getRuntimeSetting } from "@/lib/site-settings-db";
import { sendOutboundEmail, isOutboundEmailConfigured } from "@/lib/outbound-email";
import { getEmailLogoUrlSetting } from "@/lib/shop-runtime";
import { getEmailTemplate } from "@/lib/email-templates-db";
import {
  buildEmailVars,
  customerOnlyOrder,
  renderEmailTemplate,
} from "@/lib/email-template-render";
import { requirePrisma } from "@/lib/database";

export const DEFAULT_NEWSLETTER_PROMO_CODE = "WELCOME5";
export const DEFAULT_NEWSLETTER_PROMO_PERCENT = 5;

export type NewsletterPromo = {
  code: string;
  percent: number;
  label: string;
};

export async function getNewsletterPromo(): Promise<NewsletterPromo> {
  const codeRaw = (await getRuntimeSetting("NEWSLETTER_PROMO_CODE")).trim().toUpperCase();
  const code = codeRaw || DEFAULT_NEWSLETTER_PROMO_CODE;
  const prisma = getPrisma();
  let percent = DEFAULT_NEWSLETTER_PROMO_PERCENT;
  if (prisma) {
    try {
      const coupon = await prisma.coupon.findUnique({ where: { code } });
      if (coupon?.active && coupon.type === "percent") {
        const n = Number(coupon.amount);
        if (Number.isFinite(n) && n > 0) percent = n;
      } else if (coupon?.active && coupon.type === "fixed") {
        const n = Number(coupon.amount);
        if (Number.isFinite(n) && n > 0) {
          return {
            code,
            percent: 0,
            label: `€ ${n.toFixed(2).replace(".", ",")} korting`,
          };
        }
      }
    } catch {
      /* table may not exist yet */
    }
  }
  return {
    code,
    percent,
    label: `${percent}% korting`,
  };
}

/** Zorg dat de nieuwsbriefcode als actieve coupon in de DB staat. */
export async function ensureNewsletterCoupon(promo?: NewsletterPromo): Promise<NewsletterPromo> {
  const resolved = promo ?? (await getNewsletterPromo());
  const prisma = getPrisma();
  if (!prisma) return resolved;
  try {
    const existing = await prisma.coupon.findUnique({ where: { code: resolved.code } });
    if (existing) {
      if (!existing.active) {
        await prisma.coupon.update({ where: { code: resolved.code }, data: { active: true } });
      }
      return resolved;
    }
    const amount =
      resolved.percent > 0 ? resolved.percent : DEFAULT_NEWSLETTER_PROMO_PERCENT;
    await prisma.coupon.create({
      data: {
        code: resolved.code,
        type: "percent",
        amount,
        active: true,
      },
    });
  } catch {
    /* ignore race / missing table */
  }
  return resolved;
}

export type SubscribeNewsletterResult =
  | { ok: true; code: string; label: string; alreadySubscribed: boolean; emailSent: boolean }
  | { ok: false; error: string };

export async function subscribeNewsletter(input: {
  email: string;
  source?: string;
}): Promise<SubscribeNewsletterResult> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@") || email.length < 5) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }

  const prisma = getPrisma();
  if (!prisma) {
    return { ok: false, error: "Database niet beschikbaar." };
  }

  const promo = await ensureNewsletterCoupon();
  let alreadySubscribed = false;

  try {
    const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
    if (existing) {
      alreadySubscribed = true;
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          email,
          source: (input.source || "footer").slice(0, 40),
          couponCode: promo.code,
        },
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/newsletter_subscribers|does not exist/i.test(msg)) {
      return {
        ok: false,
        error: "Nieuwsbrief-tabel ontbreekt nog. Draai prisma db push / migratie.",
      };
    }
    if (/unique|duplicate/i.test(msg)) {
      alreadySubscribed = true;
    } else {
      return { ok: false, error: msg || "Aanmelden mislukt." };
    }
  }

  const emailSent = await sendNewsletterWelcomeEmail(email, promo.code);

  return {
    ok: true,
    code: promo.code,
    label: promo.label,
    alreadySubscribed,
    emailSent,
  };
}

async function wasNewsletterEmailSent(email: string): Promise<boolean> {
  const prisma = requirePrisma();
  const normalized = email.trim().toLowerCase();
  const count = await prisma.marketingEmailLog.count({
    where: { email: normalized, kind: { in: ["newsletter", "welcome"] } },
  });
  return count > 0;
}

async function logNewsletterEmail(email: string): Promise<void> {
  const prisma = requirePrisma();
  await prisma.marketingEmailLog.create({
    data: {
      email: email.trim().toLowerCase(),
      kind: "newsletter",
    },
  });
}

export async function sendNewsletterWelcomeEmail(email: string, welcomeCode: string): Promise<boolean> {
  if (!(await isOutboundEmailConfigured())) return false;
  const to = email.trim();
  if (!to) return false;
  try {
    if (await wasNewsletterEmailSent(to)) return false;
  } catch {
    /* log table / constraint — still try send */
  }

  const logoUrl = await getEmailLogoUrlSetting();
  const template = await getEmailTemplate("marketing.welcome");
  const localName = to.split("@")[0] || "klant";
  const { subject, text, html } = renderEmailTemplate(
    template,
    buildEmailVars(customerOnlyOrder(localName), { welcomeCode }),
    logoUrl,
  );
  const ok = await sendOutboundEmail({ to, subject, text, html });
  if (ok) {
    try {
      await logNewsletterEmail(to);
    } catch {
      /* kind constraint may need migration */
    }
  }
  return ok;
}
