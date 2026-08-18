import { notFound } from "next/navigation";

import AdminOrderDetail from "@/components/admin/AdminOrderDetail";
import { getMolliePayment } from "@/lib/mollie";
import { parseOrderCheckoutNotes } from "@/lib/orders";
import { getOrderById } from "@/lib/orders-db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id)) {
    notFound();
  }

  const order = await getOrderById(id);
  if (!order) {
    notFound();
  }

  let paymentStatus = order.payment_status;
  if (order.mollie_payment_id) {
    try {
      const payment = await getMolliePayment(order.mollie_payment_id);
      paymentStatus = payment.status;
    } catch {
      // Mollie kan tijdelijk onbereikbaar zijn; toon dan de opgeslagen status.
    }
  }

  const checkoutMeta = parseOrderCheckoutNotes(order.notes);

  return (
    <AdminOrderDetail
      order={{ ...order, payment_status: paymentStatus }}
      shippingLabel={checkoutMeta.shippingLabel}
      couponCode={checkoutMeta.couponCode}
      customerNote={checkoutMeta.customerNote}
    />
  );
}
