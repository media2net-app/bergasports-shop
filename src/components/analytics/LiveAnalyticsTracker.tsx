"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { useCart } from "@/components/cart/CartProvider";

const VISITOR_KEY = "esh_visitor_id";
const HEARTBEAT_MS = 25_000;

function readVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function readSessionId(): string {
  try {
    let id = sessionStorage.getItem("esh_session_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("esh_session_id", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function productIdFromPath(path: string): number | null {
  const numeric = path.match(/^\/product\/(\d+)(?:\/|$|\?)/);
  if (numeric) {
    const id = Number.parseInt(numeric[1], 10);
    return Number.isFinite(id) ? id : null;
  }
  if (!path.startsWith("/product/")) {
    return null;
  }
  if (typeof document === "undefined") {
    return null;
  }
  const el = document.querySelector("[data-product-id]");
  const raw = el?.getAttribute("data-product-id");
  if (!raw) {
    return null;
  }
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

export default function LiveAnalyticsTracker() {
  const pathname = usePathname() ?? "/";
  const { analyticsFunnel } = useCart();
  const funnelRef = useRef(analyticsFunnel);

  useEffect(() => {
    funnelRef.current = analyticsFunnel;
  }, [analyticsFunnel]);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      return;
    }

    const visitorId = readVisitorId();
    const sessionId = readSessionId();

    async function ping() {
      const path = pathname || "/";
      const productId = productIdFromPath(path);
      const funnel = funnelRef.current;
      try {
        await fetch("/api/analytics/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            sessionId,
            path,
            productId,
            referrer: typeof document !== "undefined" ? document.referrer || null : null,
            cartItemsCount: funnel.cartItemsCount,
            cartOpen: funnel.cartOpen,
            checkoutActive: funnel.checkoutActive,
          }),
          keepalive: true,
        });
      } catch {
        /* ignore */
      }
    }

    void ping();
    const id = window.setInterval(() => void ping(), HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [pathname, analyticsFunnel]);

  return null;
}
