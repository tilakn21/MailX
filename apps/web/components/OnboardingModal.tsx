"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { PlayIcon } from "lucide-react";
import { useModal } from "@/hooks/useModal";
import { YouTubeVideo } from "@/components/YouTubeVideo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function OnboardingModal({
  title,
  description,
  videoId,
  buttonProps,
}: {
  title: string;
  description: React.ReactNode;
  videoId: string;
  buttonProps?: React.ComponentProps<typeof Button>;
}) {
  // Empty component that does nothing - video buttons removed per user request
  return null;
}

export function OnboardingModalDialog({
  isModalOpen,
  setIsModalOpen,
  title,
  description,
  videoId,
}: {
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  videoId: string;
}) {
  // Video components removed per user request
  return null;
}

export const useOnboarding = (feature: string) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasViewedOnboarding, setHasViewedOnboarding] = useLocalStorage(
    `viewed${feature}Onboarding`,
    false,
  );

  useEffect(() => {
    if (!hasViewedOnboarding) {
      setIsOpen(true);
      setHasViewedOnboarding(true);
    }
  }, [setHasViewedOnboarding, hasViewedOnboarding]);

  const onClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    hasViewedOnboarding,
    setIsOpen,
    onClose,
  };
};
