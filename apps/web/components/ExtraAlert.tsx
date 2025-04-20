"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { AlertWithButton } from "@/components/Alert";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/Tooltip";
import { usePremiumModal } from "@/app/(app)/premium/PremiumModal";
import { PremiumTier } from "@prisma/client";
import { useUser } from "@/hooks/useUser";
import { businessTierName } from "@/app/(app)/premium/config";
import { useCallback, createContext, useContext } from "react";

// Create a context for extra feature access
const ExtraContext = createContext<{
  hasExtraAccess: boolean;
  isLoading: boolean;
}>({
  hasExtraAccess: false,
  isLoading: true,
});

// Hook to check if user has access to extra features
export function useExtra() {
  const context = useContext(ExtraContext);
  if (!context) {
    throw new Error("useExtra must be used within an ExtraProvider");
  }
  return context;
}

// Component to display alert for extra features
function ExtraFeatureAlert({
  showUpgradeOption,
  className,
  tier,
}: {
  showUpgradeOption: boolean;
  className?: string;
  tier?: PremiumTier | null;
}) {
  const { PremiumModal, openModal } = usePremiumModal();

  return (
    <div className={className}>
      <AlertWithButton
        title="Extra Feature"
        description="This is an extra feature. Upgrade to access it."
        button={
          <Button onClick={openModal} variant="blue">
            Upgrade
          </Button>
        }
        icon={<SparklesIcon className="size-4" />}
        variant="blue"
      />
      <PremiumModal />
    </div>
  );
}

// Component that checks user data and conditionally shows the alert
export function ExtraAlertWithData({ className }: { className?: string }) {
  const { isPremium, isLoading: isLoadingUser, tier } = useUser();

  const hasExtraAccess = isPremium;

  if (!isLoadingUser && !hasExtraAccess) {
    return (
      <ExtraFeatureAlert
        showUpgradeOption={true}
        className={className}
        tier={tier}
      />
    );
  }

  return null;
}

// Tooltip component for extra features
export function ExtraTooltip(props: {
  children: React.ReactElement<any>;
  showTooltip: boolean;
}) {
  const { PremiumModal, openModal } = usePremiumModal();

  if (!props.showTooltip) return props.children;

  return (
    <Tooltip contentComponent={<ExtraTooltipContent openModal={openModal} />}>
      <span>{props.children}</span>
    </Tooltip>
  );
}

// Content for the tooltip
export function ExtraTooltipContent({ openModal }: { openModal: () => void }) {
  return (
    <div className="text-center">
      <p className="mb-2">This is an extra feature.</p>
      <Button onClick={openModal} size="sm" variant="blue">
        Upgrade
      </Button>
    </div>
  );
}
