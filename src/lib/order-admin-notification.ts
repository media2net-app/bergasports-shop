import "server-only";

import { sendOutboundEmail } from "@/lib/outbound-email";
import { getEmailLogoUrlSetting } from "@/lib/shop-runtime";
import { getRuntimeSetting } from "@/lib/site-settings-db";
import {
  buildAdminNewOrderEmailParts,
  type AdminNewOrderEmailInput,
} from "@/lib/transactional-order-emails";

/** Sends email to ORDER_NOTIFICATION_EMAIL (SMTP or Resend). */
export async function notifyAdminNewOrder(input: AdminNewOrderEmailInput): Promise<void> {
  const to = (await getRuntimeSetting("ORDER_NOTIFICATION_EMAIL")).trim();
  if (!to) {
    return;
  }

  const { subject, text, html } = buildAdminNewOrderEmailParts(input, await getEmailLogoUrlSetting());
  await sendOutboundEmail({ to, subject, text, html });
}
