"use server";

import uniq from "lodash/uniq";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import prisma from "@/utils/prisma";
import { env } from "@/env";
import {
  isAdminForExtra,
  isOnHigherTier,
  isExtra,
} from "@/utils/extra-features";
import { cancelextra, upgradeToextra } from "@/utils/extra-features";
import {
  changeextraStatusSchema,
  type ChangeextraStatusOptions,
} from "@/app/(app)/admin/validation";
import {
  activateLemonLicenseKey,
  getLemonCustomer,
  switchextraPlan,
  updateSubscriptionItemQuantity,
} from "@/app/api/lemon-squeezy/api";
import { isAdmin } from "@/utils/admin";
import { extraTier } from "@prisma/client";
import { withActionInstrumentation } from "@/utils/actions/middleware";
import { ONE_MONTH_MS, ONE_YEAR_MS } from "@/utils/date";
import { getVariantId } from "@/utils/extra-features";

export const decrementUnsubscribeCreditAction = withActionInstrumentation(
  "decrementUnsubscribeCredit",
  async () => {
    const session = await auth();
    if (!session?.user.email) return { error: "Not logged in" };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        extra: {
          select: {
            id: true,
            unsubscribeCredits: true,
            unsubscribeMonth: true,
            lemonSqueezyRenewsAt: true,
          },
        },
      },
    });

    if (!user) return { error: "User not found" };

    const isUserextra = isExtra(user.extra?.lemonSqueezyRenewsAt || null);
    if (isUserextra) return;

    const currentMonth = new Date().getMonth() + 1;

    // create extra row for user if it doesn't already exist
    const extra = user.extra || (await createextraForUser(session.user.id));

    if (!extra?.unsubscribeMonth || extra?.unsubscribeMonth !== currentMonth) {
      // reset the monthly credits
      await prisma.extra.update({
        where: { id: extra.id },
        data: {
          // reset and use a credit
          unsubscribeCredits: env.NEXT_PUBLIC_FREE_UNSUBSCRIBE_CREDITS - 1,
          unsubscribeMonth: currentMonth,
        },
      });
    } else {
      if (!extra?.unsubscribeCredits || extra.unsubscribeCredits <= 0) return;

      // decrement the monthly credits
      await prisma.extra.update({
        where: { id: extra.id },
        data: { unsubscribeCredits: { decrement: 1 } },
      });
    }
  },
);

export const updateMultiAccountextraAction = withActionInstrumentation(
  "updateMultiAccountextra",
  async (emails: string[]) => {
    const session = await auth();
    if (!session?.user.id) return { error: "Not logged in" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        extra: {
          select: {
            id: true,
            tier: true,
            lemonSqueezySubscriptionItemId: true,
            emailAccountsAccess: true,
            admins: { select: { id: true } },
            pendingInvites: true,
          },
        },
      },
    });

    if (!user) return { error: "User not found" };

    if (!isAdminForExtra(user.extra?.admins || [], session.user.id))
      return { error: "Not admin" };

    // check all users exist
    const uniqueEmails = uniq(emails);
    const users = await prisma.user.findMany({
      where: { email: { in: uniqueEmails } },
      select: { id: true, extra: true, email: true },
    });

    const extra = user.extra || (await createextraForUser(session.user.id));

    const otherUsers = users.filter((u) => u.id !== session.user.id);

    // make sure that the users being added to this plan are not on higher tiers already
    for (const userToAdd of otherUsers) {
      if (isOnHigherTier(userToAdd.extra?.tier, extra.tier)) {
        return {
          error:
            "One of the users you are adding to your plan already has extra and cannot be added.",
        };
      }
    }

    if ((extra.emailAccountsAccess || 0) < uniqueEmails.length) {
      // TODO lifetime users
      if (!extra.lemonSqueezySubscriptionItemId) {
        return {
          error: `You must upgrade to extra before adding more users to your account.`,
        };
      }

      await updateSubscriptionItemQuantity({
        id: extra.lemonSqueezySubscriptionItemId,
        quantity: uniqueEmails.length,
      });
    }

    // delete extra for other users when adding them to this extra plan
    // don't delete the extra for the current user
    await prisma.extra.deleteMany({
      where: {
        id: { not: extra.id },
        users: { some: { id: { in: otherUsers.map((u) => u.id) } } },
      },
    });

    // add users to plan
    await prisma.extra.update({
      where: { id: extra.id },
      data: {
        users: { connect: otherUsers.map((user) => ({ id: user.id })) },
      },
    });

    // add users to pending invites
    const nonExistingUsers = uniqueEmails.filter(
      (email) => !users.some((u) => u.email === email),
    );
    await prisma.extra.update({
      where: { id: extra.id },
      data: {
        pendingInvites: {
          set: uniq([...(extra.pendingInvites || []), ...nonExistingUsers]),
        },
      },
    });
  },
);

export const switchextraPlanAction = withActionInstrumentation(
  "switchextraPlan",
  async (extraTier: extraTier) => {
    const session = await auth();
    if (!session?.user.id) return { error: "Not logged in" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        extra: {
          select: { lemonSqueezySubscriptionId: true },
        },
      },
    });

    if (!user) return { error: "User not found" };
    if (!user.extra?.lemonSqueezySubscriptionId)
      return { error: "You do not have a extra subscription" };

    const variantId = getVariantId({ tier: extraTier });

    await switchextraPlan(user.extra.lemonSqueezySubscriptionId, variantId);
  },
);

async function createextraForUser(userId: string) {
  return await prisma.extra.create({
    data: {
      users: { connect: { id: userId } },
      admins: { connect: { id: userId } },
    },
  });
}

export const activateLicenseKeyAction = withActionInstrumentation(
  "activateLicenseKey",
  async (licenseKey: string) => {
    const session = await auth();
    if (!session?.user.email) return { error: "Not logged in" };

    const lemonSqueezyLicense = await activateLemonLicenseKey(
      licenseKey,
      `License for ${session.user.email}`,
    );

    if (lemonSqueezyLicense.error) {
      return {
        error: lemonSqueezyLicense.data?.error || "Error activating license",
      };
    }

    const seats = {
      [env.LICENSE_1_SEAT_VARIANT_ID || ""]: 1,
      [env.LICENSE_3_SEAT_VARIANT_ID || ""]: 3,
      [env.LICENSE_5_SEAT_VARIANT_ID || ""]: 5,
      [env.LICENSE_10_SEAT_VARIANT_ID || ""]: 10,
      [env.LICENSE_25_SEAT_VARIANT_ID || ""]: 25,
    };

    await upgradeToextra({
      userId: session.user.id,
      tier: extraTier.LIFETIME,
      lemonLicenseKey: licenseKey,
      lemonLicenseInstanceId: lemonSqueezyLicense.data?.instance?.id,
      emailAccountsAccess:
        seats[lemonSqueezyLicense.data?.meta.variant_id || ""],
      lemonSqueezyCustomerId:
        lemonSqueezyLicense.data?.meta.customer_id || null,
      lemonSqueezyOrderId: lemonSqueezyLicense.data?.meta.order_id || null,
      lemonSqueezyProductId: lemonSqueezyLicense.data?.meta.product_id || null,
      lemonSqueezyVariantId: lemonSqueezyLicense.data?.meta.variant_id || null,
      lemonSqueezySubscriptionId: null,
      lemonSqueezySubscriptionItemId: null,
      lemonSqueezyRenewsAt: null,
    });
  },
);

export const changeextraStatusAction = withActionInstrumentation(
  "changeextraStatus",
  async (unsafeData: ChangeextraStatusOptions) => {
    const session = await auth();
    if (!session?.user.email) return { error: "Not logged in" };
    if (!isAdmin(session.user.email)) return { error: "Not admin" };

    const { data, error } = changeextraStatusSchema.safeParse(unsafeData);
    if (!data) return { error };

    const userToUpgrade = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, extraId: true },
    });

    if (!userToUpgrade) return { error: "User not found" };

    let lemonSqueezySubscriptionId: number | null = null;
    let lemonSqueezySubscriptionItemId: number | null = null;
    let lemonSqueezyOrderId: number | null = null;
    let lemonSqueezyProductId: number | null = null;
    let lemonSqueezyVariantId: number | null = null;

    if (data.upgrade) {
      if (data.lemonSqueezyCustomerId) {
        const lemonCustomer = await getLemonCustomer(
          data.lemonSqueezyCustomerId.toString(),
        );
        if (!lemonCustomer.data) return { error: "Lemon customer not found" };
        const subscription = lemonCustomer.data.included?.find(
          (i) => i.type === "subscriptions",
        );
        if (!subscription) return { error: "Subscription not found" };
        lemonSqueezySubscriptionId = Number.parseInt(subscription.id);
        const attributes = subscription.attributes as any;
        lemonSqueezyOrderId = Number.parseInt(attributes.order_id);
        lemonSqueezyProductId = Number.parseInt(attributes.product_id);
        lemonSqueezyVariantId = Number.parseInt(attributes.variant_id);
        lemonSqueezySubscriptionItemId = attributes.first_subscription_item.id
          ? Number.parseInt(attributes.first_subscription_item.id)
          : null;
      }

      const getRenewsAt = (period: extraTier): Date | null => {
        const now = new Date();
        switch (period) {
          case extraTier.PRO_ANNUALLY:
          case extraTier.BUSINESS_ANNUALLY:
          case extraTier.BASIC_ANNUALLY:
            return new Date(now.getTime() + ONE_YEAR_MS * (data.count || 1));
          case extraTier.PRO_MONTHLY:
          case extraTier.BUSINESS_MONTHLY:
          case extraTier.BASIC_MONTHLY:
          case extraTier.COPILOT_MONTHLY:
            return new Date(now.getTime() + ONE_MONTH_MS * (data.count || 1));
          default:
            return null;
        }
      };

      await upgradeToextra({
        userId: userToUpgrade.id,
        tier: data.period,
        lemonSqueezyCustomerId: data.lemonSqueezyCustomerId || null,
        lemonSqueezySubscriptionId,
        lemonSqueezySubscriptionItemId,
        lemonSqueezyOrderId,
        lemonSqueezyProductId,
        lemonSqueezyVariantId,
        lemonSqueezyRenewsAt: getRenewsAt(data.period),
        emailAccountsAccess: data.emailAccountsAccess,
      });
    } else if (userToUpgrade) {
      if (userToUpgrade.extraId) {
        await cancelextra({
          extraId: userToUpgrade.extraId,
          lemonSqueezyEndsAt: new Date(),
          expired: true,
        });
      } else {
        return { error: "User not extra." };
      }
    }
  },
);

export const claimextraAdminAction = withActionInstrumentation(
  "claimextraAdmin",
  async () => {
    const session = await auth();
    if (!session?.user.id) return { error: "Not logged in" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { extra: { select: { id: true, admins: true } } },
    });

    if (!user) return { error: "User not found" };
    if (!user.extra?.id) return { error: "User does not have a extra" };
    if (user.extra?.admins.length) return { error: "Already has admin" };

    await prisma.extra.update({
      where: { id: user.extra.id },
      data: { admins: { connect: { id: session.user.id } } },
    });
  },
);
