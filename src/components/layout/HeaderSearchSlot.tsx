"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeaderSearchBar = dynamic(() => import("@/components/layout/HeaderSearchBar"), {
  ssr: false,
  loading: () => (
    <div
      className="h-11 w-full rounded-full border border-white/20 bg-white/5"
      aria-hidden
    />
  ),
});

function SearchPlaceholder({ dark }: { dark?: boolean }) {
  return (
    <div
      className={`h-11 w-full rounded-full border ${
        dark ? "border-white/20 bg-white/5" : "border-[#e5dcc8] bg-white/70"
      }`}
      aria-hidden
    />
  );
}

type Props = {
  variant?: "light" | "dark";
  /** Focus input when search panel opens (header). */
  autoFocus?: boolean;
};

/** Defers search bundle until after first paint. */
export default function HeaderSearchSlot({ variant = "light", autoFocus = false }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => setReady(true), 1);
    return () => window.clearTimeout(t);
  }, []);

  return ready ? (
    <HeaderSearchBar variant={variant} autoFocus={autoFocus} />
  ) : (
    <SearchPlaceholder dark={variant === "dark"} />
  );
}
