import { useCallback } from "react";

// Simplified extra modal - everything is free now
export function useExtraModal() {
  // No-op function since all features are free
  const openModal = () => {};

  // Empty component - no extra modal needed
  const ExtraModal = useCallback(() => {
    return null;
  }, []);

  return {
    openModal,
    ExtraModal,
  };
}
