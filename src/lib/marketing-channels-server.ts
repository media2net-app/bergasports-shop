import "server-only";

import { getRuntimeSetting } from "@/lib/site-settings-db";

/** DB override + env via getRuntimeSetting (preferred in server pages). */
export async function marketingChannelEnvStatusAsync(envKeys: string[]): Promise<{
  configured: boolean;
  items: { key: string; set: boolean }[];
}> {
  if (envKeys.length === 0) {
    return { configured: true, items: [] };
  }
  const items = await Promise.all(
    envKeys.map(async (key) => ({
      key,
      set: Boolean((await getRuntimeSetting(key)).trim()),
    })),
  );
  return {
    configured: items.every((i) => i.set),
    items,
  };
}
