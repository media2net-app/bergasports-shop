export type EasySalesSyncStatus = "synced" | "failed" | "pending" | null;

export function easySalesSyncLabel(status: EasySalesSyncStatus): string {
  switch (status) {
    case "synced":
      return "Gesynchroniseerd";
    case "failed":
      return "Sync mislukt";
    case "pending":
      return "In wachtrij";
    default:
      return "Niet gesynchroniseerd";
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
