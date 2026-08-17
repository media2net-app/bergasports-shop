import "server-only";

import { getRuntimeSetting } from "@/lib/site-settings-db";

export type ResendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

async function resendFromAddress(): Promise<string> {
  return (
    (await getRuntimeSetting("ORDER_NOTIFICATION_FROM")).trim() ||
    (await getRuntimeSetting("SMTP_FROM")).trim() ||
    "Bergasports <info@bergasports.com>"
  );
}

export async function isResendConfigured(): Promise<boolean> {
  return Boolean((await getRuntimeSetting("RESEND_API_KEY")).trim());
}

/** Send email via Resend API. Returns false when skipped (no API key) or on failure. */
export async function sendResendEmail(input: ResendEmailInput): Promise<boolean> {
  const apiKey = (await getRuntimeSetting("RESEND_API_KEY")).trim();
  const from = await resendFromAddress();
  if (!apiKey || !from) {
    return false;
  }

  const to = (Array.isArray(input.to) ? input.to : [input.to]).map((x) => x.trim()).filter(Boolean);
  if (!to.length) {
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[resend]", res.status, body);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[resend]", e);
    return false;
  }
}
