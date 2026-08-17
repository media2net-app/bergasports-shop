import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import TrustBar from "@/components/layout/TrustBar";
import { getMolliePayment } from "@/lib/mollie";
import { getOrderByNumber, markMollieOrderPaid } from "@/lib/orders-db";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ order?: string }>;
};

export default async function CheckoutReturnPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const orderNumber = sp.order?.trim() || "";
  const order = orderNumber ? await getOrderByNumber(orderNumber) : null;

  let paid = order?.status === "pending" || order?.status === "confirmed";
  let pendingPayment = order?.status === "awaiting_payment";

  if (order?.mollie_payment_id && pendingPayment) {
    try {
      const payment = await getMolliePayment(order.mollie_payment_id);
      if (payment.status === "paid") {
        await markMollieOrderPaid(order.id);
        paid = true;
        pendingPayment = false;
      }
    } catch (e) {
      console.error("[checkout/return] mollie status", e);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8f5]">
      <TrustBar />
      <Header />
      <section className="mx-auto w-full max-w-lg px-4 py-12 md:py-16">
        {!order ? (
          <div className="rounded-2xl border border-[#e5dcc8] bg-white p-6 text-center">
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--foreground)]">
              Bestelling niet gevonden
            </h1>
            <p className="mt-2 text-sm text-[var(--foreground)]/75">
              We konden deze bestelling niet laden. Check je e-mail of neem contact op.
            </p>
            <Link href="/shop" className="mt-6 inline-block text-sm font-semibold text-[#B38F27] underline">
              Terug naar de shop
            </Link>
          </div>
        ) : paid ? (
          <div className="rounded-2xl border border-[#e5dcc8] bg-white p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Betaald</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--foreground)]">
              Bedankt voor je bestelling
            </h1>
            <p className="mt-2 text-sm text-[var(--foreground)]/80">
              Bestelling <strong>{order.order_number}</strong> is betaald
              {order.customer_email ? ` — bevestiging gaat naar ${order.customer_email}` : ""}.
            </p>
            <p className="mt-4 text-lg font-bold text-[var(--foreground)]">
              {formatProductPrice(order.total, order.currency)}
            </p>
            <Link
              href="/shop"
              className="mt-8 inline-flex rounded-xl bg-[#B38F27] px-5 py-3 text-sm font-bold text-white hover:bg-[#96741f]"
            >
              Verder winkelen
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e5dcc8] bg-white p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Betaling nog niet bevestigd
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--foreground)]">
              Even geduld
            </h1>
            <p className="mt-2 text-sm text-[var(--foreground)]/80">
              Bestelling <strong>{order.order_number}</strong> wacht nog op bevestiging van Mollie.
              Vernieuw deze pagina over een paar seconden, of check je e-mail.
            </p>
            <Link
              href={`/checkout/return?order=${encodeURIComponent(order.order_number)}`}
              className="mt-8 inline-flex rounded-xl bg-[#B38F27] px-5 py-3 text-sm font-bold text-white hover:bg-[#96741f]"
            >
              Status vernieuwen
            </Link>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
