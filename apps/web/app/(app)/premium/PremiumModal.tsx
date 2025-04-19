import { useCallback } from "react";

// Simplified premium modal - everything is free now
export function usePremiumModal() {
  // No-op function since all features are free
  const openModal = () => {};

  // Empty component - no premium modal needed
  const PremiumModal = useCallback(() => {
    return null;
  }, []);

  return {
    openModal,
    PremiumModal,
  };
}
