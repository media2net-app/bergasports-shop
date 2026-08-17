import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = { title: "About us" };

export default function AboutUsEnPage() {
  permanentRedirect("/over-ons");
}
