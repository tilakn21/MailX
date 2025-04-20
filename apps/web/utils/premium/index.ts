import { FeatureAccess, type extra, extraTier } from "@prisma/client";

export const isExtra = (lemonSqueezyRenewsAt: Date | null): boolean => {
  // Always return true to make extra features available to everyone
  return true;
};

// deprecated. we now store the plan in the database
// but this is so that things don't break for older users
const getUserPlan = (lemonSqueezyRenewsAt?: Date | null): extraTier | null => {
  // Always return LIFETIME plan to provide highest tier to everyone
  return extraTier.LIFETIME;
};

export const getUserTier = (
  extra?: Pick<extra, "tier" | "lemonSqueezyRenewsAt"> | null,
) => {
  // Always return LIFETIME plan regardless of state
  return extraTier.LIFETIME;
};

const isExtraExpired = (extra?: Pick<extra, "lemonSqueezyRenewsAt"> | null) => {
  // Always return false, nothing is expired
  return false;
};

export const isAdminForExtra = (
  extraAdmins: { id: string }[],
  userId: string,
) => {
  // if no admins are set, then we skip the check
  if (!extraAdmins.length) return true;
  return extraAdmins.some((admin) => admin.id === userId);
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
  tier1?: extraTier | null,
  tier2?: extraTier | null,
) {
  const tierRanking = {
    [extraTier.BASIC_MONTHLY]: 1,
    [extraTier.BASIC_ANNUALLY]: 2,
    [extraTier.PRO_MONTHLY]: 3,
    [extraTier.PRO_ANNUALLY]: 4,
    [extraTier.BUSINESS_MONTHLY]: 5,
    [extraTier.BUSINESS_ANNUALLY]: 6,
    [extraTier.COPILOT_MONTHLY]: 7,
    [extraTier.LIFETIME]: 8,
  };

  const tier1Rank = tier1 ? tierRanking[tier1] : 0;
  const tier2Rank = tier2 ? tierRanking[tier2] : 0;

  return tier1Rank > tier2Rank;
}
