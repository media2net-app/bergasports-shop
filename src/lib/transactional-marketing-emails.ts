import type { OrderWithItems } from "@/lib/orders";
import { customerOnlyOrder, renderDefaultEmailTemplate } from "@/lib/email-template-render";

export type MarketingEmailKind = "welcome" | "post_purchase" | "win_back" | "newsletter";

export type MarketingEmailBrandOpts = {
  logoUrl?: string;
  winBackCode?: string;
  winBackExpiryDays?: number;
  welcomeCode?: string;
};

function expiryDateNl(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("nl-NL", { dateStyle: "long" }).format(d);
}

function winBackExtra(opts?: MarketingEmailBrandOpts) {
  const expiryDaysRaw = opts?.winBackExpiryDays ?? Number(process.env.MARKETING_WINBACK_EXPIRY_DAYS?.trim() || "14");
  const expiryDays = Number.isFinite(expiryDaysRaw) && expiryDaysRaw > 0 ? expiryDaysRaw : 14;
  return {
    winBackCode: opts?.winBackCode?.trim() || process.env.MARKETING_WINBACK_CODE?.trim() || "TERUG10",
    winBackExpiry: expiryDateNl(expiryDays),
  };
}

export function buildWelcomeEmailParts(
  customerName: string,
  opts?: MarketingEmailBrandOpts,
): { subject: string; text: string; html: string } {
  return renderDefaultEmailTemplate(
    "marketing.welcome",
    customerOnlyOrder(customerName),
    opts?.logoUrl,
    { welcomeCode: opts?.welcomeCode?.trim() || "" },
  );
}

export function buildPostPurchaseEmailParts(
  order: OrderWithItems,
  opts?: MarketingEmailBrandOpts,
): { subject: string; text: string; html: string } {
  return renderDefaultEmailTemplate("marketing.post_purchase", order, opts?.logoUrl);
}

export function buildWinBackEmailParts(
  customerName: string,
  opts?: MarketingEmailBrandOpts,
): { subject: string; text: string; html: string } {
  return renderDefaultEmailTemplate(
    "marketing.win_back",
    customerOnlyOrder(customerName),
    opts?.logoUrl,
    winBackExtra(opts),
  );
}
