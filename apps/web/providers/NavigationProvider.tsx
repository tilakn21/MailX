"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRoutePreloading } from "@/hooks/useRoutePreloading";

interface NavigationContextType {
  isNavigating: boolean;
  currentRoute: string;
  navigateTo: (href: string) => void;
  preloadRoute: (href: string) => void;
}

const NavigationContext = createContext<NavigationContextType>({
  isNavigating: false,
  currentRoute: "",
  navigateTo: () => {},
  preloadRoute: () => {},
});

export const useNavigation = () => useContext(NavigationContext);

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentRoute, setCurrentRoute] = useState(pathname);
  const { preload } = useRoutePreloading(pathname);

  // Update current route when pathname changes
  useEffect(() => {
    setCurrentRoute(pathname);
  }, [pathname]);

  // Function to navigate to a route with loading state
  const navigateTo = useCallback(
    (href: string) => {
      if (href === pathname || href.startsWith("http")) {
        return;
      }

      setIsNavigating(true);

      // Add a slight delay to show loading state for very fast navigations
      const navigationTimeout = setTimeout(() => {
        router.push(href);

        // Reset navigation state after a short delay to ensure the loading indicator shows
        setTimeout(() => {
          setIsNavigating(false);
        }, 100);
      }, 10);

      return () => clearTimeout(navigationTimeout);
    },
    [router, pathname],
  );

  // Function to preload a route
  const preloadRoute = useCallback(
    (href: string) => {
      preload(href);
    },
    [preload],
  );

  // Listen for route change start and end events
  useEffect(() => {
    // For Next.js App Router, we need to manually handle navigation events
    const handleRouteChangeStart = () => {
      setIsNavigating(true);
    };

    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
    };

    // Clean up any pending navigation state on unmount
    return () => {
      setIsNavigating(false);
    };
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating,
        currentRoute,
        navigateTo,
        preloadRoute,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}
