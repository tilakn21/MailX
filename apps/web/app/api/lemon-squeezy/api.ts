"use server";

import { env } from "@/env";
import {
  lemonSqueezySetup,
  updateSubscriptionItem,
  getCustomer,
  activateLicense,
  updateSubscription,
} from "@lemonsqueezy/lemonsqueezy.js";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("Lemon Squeezy");

let isSetUp = false;

function setUpLemon() {
  if (!env.LEMON_SQUEEZY_API_KEY) return;
  if (isSetUp) return;
  lemonSqueezySetup({ apiKey: env.LEMON_SQUEEZY_API_KEY });
  isSetUp = true;
}

export async function updateSubscriptionItemQuantity(options: {
  id: number;
  quantity: number;
}) {
  setUpLemon();
  logger.info("Updating subscription item quantity", options);
  return updateSubscriptionItem(options.id, {
    quantity: options.quantity,
    invoiceImmediately: true,
  });
}

export async function getLemonCustomer(customerId: string) {
  setUpLemon();
  return getCustomer(customerId, { include: ["subscriptions", "orders"] });
}

export async function activateLemonLicenseKey(
  licenseKey: string,
  name: string,
) {
  setUpLemon();
  logger.info("Activating license key", { licenseKey, name });
  return activateLicense(licenseKey, name);
}

export async function switchPremiumPlan(
  subscriptionId: number,
  variantId: number,
) {
  setUpLemon();
  logger.info("Switching premium plan", { subscriptionId, variantId });
  return updateSubscription(subscriptionId, { variantId });
}
