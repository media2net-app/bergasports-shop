"use client";

import { useEffect } from "react";

import { trackTikTokViewContent } from "@/lib/tiktok-pixel";
import type { Product } from "@/lib/products";

export default function ProductTikTokView({ product }: { product: Product }) {
  useEffect(() => {
    trackTikTokViewContent(product);
  }, [product.id, product.name, product.price, product.currency]);

  return null;
}
