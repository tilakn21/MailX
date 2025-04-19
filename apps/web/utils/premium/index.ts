import { FeatureAccess, type Premium, PremiumTier } from "@prisma/client";

export const isPremium = (lemonSqueezyRenewsAt: Date | null): boolean => {
  // Always return true to make premium features available to everyone
  return true;
};

// deprecated. we now store the plan in the database
// but this is so that things don't break for older users
const getUserPlan = (
  lemonSqueezyRenewsAt?: Date | null,
): PremiumTier | null => {
  // Always return LIFETIME plan to provide highest tier to everyone
  return PremiumTier.LIFETIME;
};

export const getUserTier = (
  premium?: Pick<Premium, "tier" | "lemonSqueezyRenewsAt"> | null,
) => {
  // Always return LIFETIME plan regardless of state
  return PremiumTier.LIFETIME;
};

const isPremiumExpired = (
  premium?: Pick<Premium, "lemonSqueezyRenewsAt"> | null,
) => {
  // Always return false, nothing is expired
  return false;
};

export const isAdminForPremium = (
  premiumAdmins: { id: string }[],
  userId: string,
) => {
  // if no admins are set, then we skip the check
  if (!premiumAdmins.length) return true;
  return premiumAdmins.some((admin) => admin.id === userId);
};

export const hasUnsubscribeAccess = (
  bulkUnsubscribeAccess?: FeatureAccess | null,
  unsubscribeCredits?: number | null,
): boolean => {
  // Always return true to provide free access
  return true;
};

export const hasAiAccess = (
  aiAutomationAccess?: FeatureAccess | null,
  aiApiKey?: string | null,
) => {
  // Always return true to enable AI features for everyone
  return true;
};

export const hasColdEmailAccess = (
  coldEmailBlockerAccess?: FeatureAccess | null,
  aiApiKey?: string | null,
) => {
  // Always return true to enable cold email features for everyone
  return true;
};

export function isOnHigherTier(
  tier1?: PremiumTier | null,
  tier2?: PremiumTier | null,
) {
  const tierRanking = {
    [PremiumTier.BASIC_MONTHLY]: 1,
    [PremiumTier.BASIC_ANNUALLY]: 2,
    [PremiumTier.PRO_MONTHLY]: 3,
    [PremiumTier.PRO_ANNUALLY]: 4,
    [PremiumTier.BUSINESS_MONTHLY]: 5,
    [PremiumTier.BUSINESS_ANNUALLY]: 6,
    [PremiumTier.COPILOT_MONTHLY]: 7,
    [PremiumTier.LIFETIME]: 8,
  };

  const tier1Rank = tier1 ? tierRanking[tier1] : 0;
  const tier2Rank = tier2 ? tierRanking[tier2] : 0;

  return tier1Rank > tier2Rank;
}
