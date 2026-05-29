import AdminEmailPreviews, { type EmailPreviewTab } from "@/components/admin/AdminEmailPreviews";
import { requireAdminPage } from "@/lib/admin-access";
import { loadOrderForEmailPreview } from "@/lib/email-preview-data";
import {
  buildAdminNewOrderEmailParts,
  buildAdminNewOrderTestEmailParts,
  buildOrderStatusEmailParts,
  type OrderStatusEmailKind,
} from "@/lib/transactional-order-emails";

export const metadata = {
  title: "Email — Admin",
};

const CUSTOMER_KINDS: { id: OrderStatusEmailKind; label: string }[] = [
  { id: "received", label: "Customer: received" },
  { id: "confirmed", label: "Customer: confirmed" },
  { id: "shipped", label: "Customer: shipped" },
  { id: "delivered", label: "Customer: delivered" },
  { id: "cancelled", label: "Customer: cancelled" },
];

export default async function AdminEmailPreviewPage() {
  await requireAdminPage();
  const order = await loadOrderForEmailPreview();
  const adminInput = {
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email ?? undefined,
    total: order.total,
    currency: order.currency,
    subtotal: order.subtotal,
    discountTotal: order.discount_total,
    shippingAddress: order.shipping_address,
    shippingCity: order.shipping_city,
    shippingCounty: order.shipping_county ?? undefined,
    shippingPostalCode: order.shipping_postal_code ?? undefined,
    notes: order.notes ?? undefined,
    paymentMethod: order.payment_method,
    items: order.items,
  };

  const tabs: EmailPreviewTab[] = [
    ...CUSTOMER_KINDS.map((row) => {
      const { html } = buildOrderStatusEmailParts(row.id, order);
      return { id: `cust-${row.id}`, label: row.label, html };
    }),
    {
      id: "admin-new",
      label: "Admin: new order",
      html: buildAdminNewOrderEmailParts(adminInput).html,
    },
    {
      id: "admin-test",
      label: "Admin: SMTP test",
      html: buildAdminNewOrderTestEmailParts(adminInput, "[TEST] ").html,
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-page-title">Email</h1>
          <p className="admin-page-lead">
            Live previews use the same HTML as sent messages. Product rows load from your catalog
            (featured products first). The purple header always shows the E-Store House text logo;
            optionally add an image above it via <code>NEXT_PUBLIC_EMAIL_LOGO_URL</code>.
          </p>
        </div>
      </div>
      <AdminEmailPreviews tabs={tabs} />
    </div>
  );
}
