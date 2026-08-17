import "server-only";

import { sendResendEmail, type ResendEmailInput, isResendConfigured } from "@/lib/resend-email";
import { isSmtpConfigured, sendSmtpEmail } from "@/lib/smtp-email";

export type OutboundEmailInput = ResendEmailInput;

/** True when SMTP (Hostinger, etc.) or Resend is configured. */
export async function isOutboundEmailConfigured(): Promise<boolean> {
  return (await isSmtpConfigured()) || (await isResendConfigured());
}

/**
 * Sends transactional mail: SMTP first if configured, otherwise Resend.
 * Configure Hostinger: SMTP_HOST, SMTP_USER, SMTP_PASS, optional SMTP_PORT (465), SMTP_FROM.
 */
export async function sendOutboundEmail(input: OutboundEmailInput): Promise<boolean> {
  if (await isSmtpConfigured()) {
    return sendSmtpEmail(input);
  }
  return sendResendEmail(input);
}
