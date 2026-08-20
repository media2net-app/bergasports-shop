import "server-only";

import { revalidatePath } from "next/cache";

import { requirePrisma } from "@/lib/database";
import { getWcStoreBaseUrl } from "@/lib/wc-store-config";
import { getWooCommerceCredentials } from "@/lib/woocommerce-api";
import { getRuntimeSetting } from "@/lib/site-settings-db";
import {
  runWordpressImport,
  type WordpressImportResult,
  type WordpressImportRunOptions,
} from "@/lib/wordpress-import-run";
import { normalizeWpBaseUrl, wpAuthFromEnv, type WordpressImportCredentials } from "@/lib/wordpress-import-shared";

export type { WordpressImportResult } from "@/lib/wordpress-import-run";

export async function getWordpressImportCredentials(
  baseUrlOverride?: string | null,
): Promise<WordpressImportCredentials> {
  const woo = await getWooCommerceCredentials();
  const baseSetting = await getRuntimeSetting("WC_STORE_BASE_URL");
  return {
    baseUrl: normalizeWpBaseUrl(
      baseUrlOverride?.trim() || woo?.baseUrl || baseSetting || getWcStoreBaseUrl(),
    ),
    auth: woo ? { key: woo.key, secret: woo.secret } : null,
    wpAuth: wpAuthFromEnv(),
  };
}

export async function importWordpressFromSettings(
  options: WordpressImportRunOptions & { baseUrl?: string },
): Promise<WordpressImportResult> {
  const prisma = requirePrisma();
  const creds = await getWordpressImportCredentials(options.baseUrl);
  const result = await runWordpressImport(prisma, creds, options);
  revalidatePath("/admin/settings/woocommerce");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/categorii");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/news");
  revalidatePath("/admin/pages");
  revalidatePath("/nieuws");
  revalidatePath("/");
  return result;
}
