export type NewsletterSubscriberStatus = "active" | "unsubscribed";
export type NewsletterCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";

export const NEWSLETTER_CRON_PATH = "/api/cron/newsletter";
export const NEWSLETTER_CRON_SCHEDULE = "*/15 * * * *";
export const NEWSLETTER_CRON_SCHEDULE_LABEL = "Every 15 minutes";

export function campaignStatusLabel(status: NewsletterCampaignStatus): string {
  switch (status) {
    case "scheduled":
      return "Gepland";
    case "sending":
      return "Bezig";
    case "sent":
      return "Verstuurd";
    case "failed":
      return "Mislukt";
    default:
      return "Concept";
  }
}
