import "server-only";

import { sendOutboundEmail } from "@/lib/outbound-email";
import {
  buildAdminNewOrderEmailParts,
  type AdminNewOrderEmailInput,
} from "@/lib/transactional-order-emails";

/** Sends email to ORDER_NOTIFICATION_EMAIL (SMTP or Resend). */
export async function notifyAdminNewOrder(input: AdminNewOrderEmailInput): Promise<void> {
  const to = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  if (!to) {
    return;
  }

  const { subject, text, html } = buildAdminNewOrderEmailParts(input);
  await sendOutboundEmail({ to, subject, text, html });
}
