import prisma from "@/utils/prisma";
import { FeatureAccess, extraTier } from "@prisma/client";

const TEN_YEARS = 10 * 365 * 24 * 60 * 60 * 1000;

export async function upgradeToextra(options: {
  userId: string;
  tier: extraTier;
  lemonSqueezyRenewsAt: Date | null;
  lemonSqueezySubscriptionId: number | null;
  lemonSqueezySubscriptionItemId: number | null;
  lemonSqueezyOrderId: number | null;
  lemonSqueezyCustomerId: number | null;
  lemonSqueezyProductId: number | null;
  lemonSqueezyVariantId: number | null;
  lemonLicenseKey?: string;
  lemonLicenseInstanceId?: string;
  emailAccountsAccess?: number;
}) {
  const { userId, ...rest } = options;

  const lemonSqueezyRenewsAt =
    options.tier === extraTier.LIFETIME
      ? new Date(Date.now() + TEN_YEARS)
      : options.lemonSqueezyRenewsAt;

  const user = await prisma.user.findUnique({
    where: { id: options.userId },
    select: { extraId: true },
  });

  if (!user) throw new Error(`User not found for id ${options.userId}`);

  const data = {
    ...rest,
    lemonSqueezyRenewsAt,
    ...getTierAccess(options.tier),
  };

  if (user.extraId) {
    return await prisma.extra.update({
      where: { id: user.extraId },
      data,
      select: { users: { select: { email: true } } },
    });
  }
  return await prisma.extra.create({
    data: {
      users: { connect: { id: options.userId } },
      admins: { connect: { id: options.userId } },
      ...data,
    },
    select: { users: { select: { email: true } } },
  });
}

export async function extendextra(options: {
  extraId: string;
  lemonSqueezyRenewsAt: Date;
}) {
  return await prisma.extra.update({
    where: { id: options.extraId },
    data: {
      lemonSqueezyRenewsAt: options.lemonSqueezyRenewsAt,
    },
    select: {
      users: {
        select: { email: true },
      },
    },
  });
}

export async function cancelextra({
  extraId,
  lemonSqueezyEndsAt,
  variantId,
  expired,
}: {
  extraId: string;
  lemonSqueezyEndsAt: Date;
  variantId?: number;
  expired: boolean;
}) {
  if (variantId) {
    // Check if the extra exists for the given variant
    // If the user changed plans we won't find it in the database
    // And that's okay because the user is on a different plan
    const extra = await prisma.extra.findUnique({
      where: { id: extraId, lemonSqueezyVariantId: variantId },
      select: { id: true },
    });
    if (!extra) return null;
  }

  return await prisma.extra.update({
    where: { id: extraId },
    data: {
      lemonSqueezyRenewsAt: lemonSqueezyEndsAt,
      ...(expired
        ? {
            bulkUnsubscribeAccess: null,
            aiAutomationAccess: null,
            coldEmailBlockerAccess: null,
          }
        : {}),
    },
    select: {
      users: {
        select: { email: true },
      },
    },
  });
}

export async function editEmailAccountsAccess(options: {
  extraId: string;
  count: number;
}) {
  const { count } = options;
  if (!count) return;

  return await prisma.extra.update({
    where: { id: options.extraId },
    data: {
      emailAccountsAccess:
        count > 0 ? { increment: count } : { decrement: count },
    },
    select: {
      users: {
        select: { email: true },
      },
    },
  });
}

function getTierAccess(tier: extraTier) {
  switch (tier) {
    case extraTier.BASIC_MONTHLY:
    case extraTier.BASIC_ANNUALLY:
      return {
        bulkUnsubscribeAccess: FeatureAccess.UNLOCKED,
        aiAutomationAccess: FeatureAccess.LOCKED,
        coldEmailBlockerAccess: FeatureAccess.LOCKED,
      };
    case extraTier.PRO_MONTHLY:
    case extraTier.PRO_ANNUALLY:
      return {
        bulkUnsubscribeAccess: FeatureAccess.UNLOCKED,
        aiAutomationAccess: FeatureAccess.UNLOCKED_WITH_API_KEY,
        coldEmailBlockerAccess: FeatureAccess.UNLOCKED_WITH_API_KEY,
      };
    case extraTier.BUSINESS_MONTHLY:
    case extraTier.BUSINESS_ANNUALLY:
    case extraTier.COPILOT_MONTHLY:
    case extraTier.LIFETIME:
      return {
        bulkUnsubscribeAccess: FeatureAccess.UNLOCKED,
        aiAutomationAccess: FeatureAccess.UNLOCKED,
        coldEmailBlockerAccess: FeatureAccess.UNLOCKED,
      };
    default:
      throw new Error(`Unknown extra tier: ${tier}`);
  }
}
