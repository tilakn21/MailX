"use client";

import { useEffect, useState } from "react";
import { useNavigation } from "@/providers/NavigationProvider";

export function NavigationIndicator() {
  const { isNavigating } = useNavigation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNavigating) {
      // Show the indicator immediately when navigation starts
      setVisible(true);
    } else {
      // Add a small delay before hiding to ensure smooth transitions
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 300);

      return () => clearTimeout(timeout);
    }
  }, [isNavigating]);

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
      <div className="h-full w-full animate-progress-bar" />
    </div>
  );
}
