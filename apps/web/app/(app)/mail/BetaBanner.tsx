"use client";

import { useLocalStorage } from "usehooks-ts";
import { Banner } from "@/components/Banner";
import { memo } from "react";

export const BetaBanner = memo(function BetaBanner() {
  const [bannerVisible, setBannerVisible] = useLocalStorage<
    boolean | undefined
  >("mailBetaBannerVisibile", true);

  // Early return if banner is not visible to avoid unnecessary rendering
  if (!bannerVisible) return null;

  // Only render on client side
  if (typeof window === "undefined") return null;

  return (
    <Banner
      title="Beta"
      description="Mail is currently in beta. It is not intended to be a full replacement for your email client yet."
      onClose={() => setBannerVisible(false)}
    />
  );
});
