/**
 * This file contains the features available in the free edition of MailX.
 * All extra features are now included for free.
 */

type Feature = {
  text: string;
  tooltip?: string;
};

/**
 * All features are now available for free
 */

/**
 * Features available in MailX
 */
export const features: Feature[] = [
  {
    text: "AI personal assistant",
    tooltip: "AI assistant that drafts replies and organizes your inbox",
  },
  {
    text: "Reply Zero",
    tooltip: "Never miss a reply or follow up again",
  },
  {
    text: "Cold email blocker",
    tooltip: "Automatically block cold emails",
  },
  {
    text: "Sender categories",
    tooltip:
      "Automatically group emails for easier management and bulk actions",
  },
  {
    text: "Bulk unsubscribe",
    tooltip: "Bulk unsubscribe from emails in one-click",
  },
  {
    text: "Email analytics",
  },
  {
    text: "Unlimited unsubscribes",
  },
  {
    text: "Unlimited archives",
  },
  {
    text: "Unlimited AI credits",
  },
  {
    text: "Priority support",
  },
];

/**
 * Free edition information
 */
export const freeEdition = {
  name: "Free Edition",
  description: "All extra features included for free",
  features: features,
  cta: "Get Started",
  ctaLink: "/",
};

/**
 * Helper functions that return default values to maintain compatibility with existing code
 */
export function getSubscriptionTier(): string {
  return "FREE";
}

export function getVariantId(): number {
  return 0;
}
