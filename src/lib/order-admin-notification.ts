import "server-only";

import { sendOutboundEmail } from "@/lib/outbound-email";
import { getEmailLogoUrlSetting } from "@/lib/shop-runtime";
import { getRuntimeSetting } from "@/lib/site-settings-db";
import { getEmailTemplate } from "@/lib/email-templates-db";
import {
  adminInputToPreviewOrder,
  buildEmailVars,
  renderEmailTemplate,
} from "@/lib/email-template-render";
import type { AdminNewOrderEmailInput } from "@/lib/transactional-order-emails";

/** Sends email to ORDER_NOTIFICATION_EMAIL (SMTP or Resend). */
export async function notifyAdminNewOrder(input: AdminNewOrderEmailInput): Promise<void> {
  const to = (await getRuntimeSetting("ORDER_NOTIFICATION_EMAIL")).trim();
  if (!to) {
    return;
  }

  const template = await getEmailTemplate("order.admin_new");
  const { subject, text, html } = renderEmailTemplate(
    template,
    buildEmailVars(adminInputToPreviewOrder(input)),
    await getEmailLogoUrlSetting(),
  );
  await sendOutboundEmail({ to, subject, text, html });
}
