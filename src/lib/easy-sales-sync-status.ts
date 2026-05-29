export type EasySalesSyncStatus = "synced" | "failed" | "pending" | null;

export function easySalesSyncLabel(status: EasySalesSyncStatus): string {
  switch (status) {
    case "synced":
      return "Synced";
    case "failed":
      return "Sync failed";
    case "pending":
      return "Pending";
    default:
      return "Not synced";
  }
}

export function easySalesSyncBadgeClass(status: EasySalesSyncStatus): string {
  switch (status) {
    case "synced":
      return "admin-badge-src admin-badge-easysales--ok";
    case "failed":
      return "admin-badge-src admin-badge-easysales--err";
    case "pending":
      return "admin-badge-src admin-badge-easysales--pending";
    default:
      return "admin-badge-src admin-badge-easysales--muted";
  }
}
