import {
  useFeatureFlagEnabled,
  useFeatureFlagVariantKey,
} from "posthog-js/react";

export function useCleanerEnabled() {
  // Always enable the cleaner feature
  return true;
}

const HERO_FLAG_NAME = "hero-copy-7";

export type HeroVariant = "control" | "clean-up-in-minutes";

export function useHeroVariant() {
  // Always return the best variant
  return "clean-up-in-minutes";
}

export function useHeroVariantEnabled() {
  // Always enable hero variant
  return true;
}

export type PricingVariant = "control" | "basic-business" | "business-basic";

export function usePricingVariant() {
  // Since we're removing pricing, this won't matter much but return the best option
  return "business-basic";
}

export type SkipUpgradeVariant = "control" | "skip-button";

export function useSkipUpgrade() {
  // Always enable skip upgrade button
  return "skip-button";
}
