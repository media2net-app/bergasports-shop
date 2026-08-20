import "server-only";

import { sendResendEmail, type ResendEmailInput, isResendConfigured } from "@/lib/resend-email";
import {
  isSmtpConfigured,
  sendSmtpEmailResult,
  verifySmtpConnection,
  type SmtpSendResult,
} from "@/lib/smtp-email";

export type OutboundEmailInput = ResendEmailInput;

export type OutboundEmailResult =
  | { ok: true; provider: "smtp" | "resend" }
  | { ok: false; error: string; code?: string; provider?: "smtp" | "resend" };

/** True when SMTP (Hostinger, etc.) or Resend is configured. */
export async function isOutboundEmailConfigured(): Promise<boolean> {
  return (await isSmtpConfigured()) || (await isResendConfigured());
}

/**
 * Prefer SMTP whenever host + user + password are set.
 * Resend is only used as fallback when SMTP is not configured.
 * (Leave RESEND_API_KEY empty if you want SMTP-only.)
 */
export async function sendOutboundEmailResult(
  input: OutboundEmailInput,
): Promise<OutboundEmailResult> {
  if (await isSmtpConfigured()) {
    const result = await sendSmtpEmailResult(input);
    if (result.ok) return { ok: true, provider: "smtp" };
    return { ok: false, provider: "smtp", error: result.error, code: result.code };
  }

  if (await isResendConfigured()) {
    const ok = await sendResendEmail(input);
    if (ok) return { ok: true, provider: "resend" };
    return {
      ok: false,
      provider: "resend",
      error:
        "Resend-verzenden mislukt. Controleer de Resend API-key, of configureer SMTP onder Admin → Instellingen → Verzenden.",
    };
  }

  return {
    ok: false,
    error:
      "E-mail is niet geconfigureerd. Vul SMTP host, gebruiker en wachtwoord in onder Admin → Instellingen → Verzenden (of zet een Resend API-key).",
  };
}

/** Sends mail: SMTP first if configured, otherwise Resend. */
export async function sendOutboundEmail(input: OutboundEmailInput): Promise<boolean> {
  return (await sendOutboundEmailResult(input)).ok;
}

/** Fail-fast SMTP check for bulk sends (newsletters). No-op success when using Resend only. */
export async function verifyOutboundEmail(): Promise<SmtpSendResult> {
  if (await isSmtpConfigured()) {
    return verifySmtpConnection();
  }
  if (await isResendConfigured()) {
    return { ok: true };
  }
  return {
    ok: false,
    error:
      "E-mail is niet geconfigureerd. Vul SMTP in onder Admin → Instellingen → Verzenden.",
  };
}
