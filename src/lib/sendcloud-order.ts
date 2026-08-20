import "server-only";

import {
  isPickupShippingLabel,
  parseOrderCheckoutNotes,
  type OrderWithItems,
} from "@/lib/orders";
import { updateOrderFulfillment, updateOrderStatus } from "@/lib/orders-db";
import {
  createSendcloudParcel,
  isSendcloudConfigured,
  shippingCountryFromOrder,
  type SendcloudLabelAttachResult,
} from "@/lib/sendcloud";

export type { SendcloudLabelAttachResult };

/**
 * Create a Sendcloud label for a paid shippable order and store parcel/tracking/label on the order.
 * Skips pickup orders, already-linked parcels, and missing config/address.
 */
export async function createAndAttachSendcloudLabelForOrder(
  order: OrderWithItems,
  options?: { markShipped?: boolean },
): Promise<SendcloudLabelAttachResult> {
  if (!(await isSendcloudConfigured())) {
    return { ok: false, skipped: true, error: "Sendcloud is niet geconfigureerd." };
  }

  if (order.sendcloud_parcel_id) {
    return {
      ok: true,
      parcelId: order.sendcloud_parcel_id,
      trackingCode: order.tracking_code,
      trackingUrl: order.tracking_url,
      labelUrl: order.sendcloud_label_url,
      carrier: order.shipping_carrier,
    };
  }

  const meta = parseOrderCheckoutNotes(order.notes);
  if (isPickupShippingLabel(meta.shippingLabel)) {
    return { ok: false, skipped: true, error: "Afhaalorder — geen label nodig." };
  }

  const postal = order.shipping_postal_code?.trim() ?? "";
  if (!postal) {
    return { ok: false, skipped: false, error: "Postcode ontbreekt — Sendcloud-label niet aangemaakt." };
  }

  try {
    const parcel = await createSendcloudParcel({
      name: order.customer_name,
      address: order.shipping_address,
      city: order.shipping_city,
      postalCode: postal,
      email: order.customer_email,
      telephone: order.customer_phone,
      orderNumber: order.order_number,
      country: shippingCountryFromOrder(order),
    });
    const tracking = parcel.tracking_number?.trim() || null;
    const trackingUrl = parcel.tracking_url?.trim() || null;
    const label =
      parcel.label?.label_printer || parcel.label?.normal_printer?.[0] || null;
    const carrier = parcel.carrier?.name ?? "Sendcloud";

    await updateOrderFulfillment(order.id, {
      tracking_code: tracking,
      tracking_url: trackingUrl,
      shipping_carrier: carrier,
      sendcloud_parcel_id: parcel.id,
      sendcloud_label_url: label,
    });

    if (options?.markShipped && order.status !== "shipped" && order.status !== "delivered") {
      await updateOrderStatus(order.id, "shipped");
    }

    return {
      ok: true,
      parcelId: parcel.id,
      trackingCode: tracking,
      trackingUrl,
      labelUrl: label,
      carrier,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Sendcloud mislukt";
    console.error("[sendcloud] label", order.order_number, error);
    return { ok: false, skipped: false, error };
  }
}
