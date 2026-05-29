import "server-only";

export type ResendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

function resendFromAddress(): string | null {
  return process.env.ORDER_NOTIFICATION_FROM?.trim() || "Bergasports <info@bergasports.com>";
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** Send email via Resend API. Returns false when skipped (no API key) or on failure. */
export async function sendResendEmail(input: ResendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resendFromAddress();
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
