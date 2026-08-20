import { permanentRedirect } from "next/navigation";

/** Old WP `/checkout` and `/afrekenen` land here; checkout lives in the cart drawer. */
export default function CheckoutIndexPage() {
  permanentRedirect("/shop");
}
