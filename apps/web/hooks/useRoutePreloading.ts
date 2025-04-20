"use client";

import { useRouter } from "next/navigation";
import { useEffect, useCallback } from "react";

// Define high-priority routes that should be preloaded immediately
const HIGH_PRIORITY_ROUTES = ["/mail", "/automation", "/stats", "/settings"];

// Define medium-priority routes that should be preloaded after high-priority ones
const MEDIUM_PRIORITY_ROUTES = [
  "/reply-zero",
  "/cold-email-blocker",
  "/bulk-unsubscribe",
];

// Define low-priority routes that should be preloaded during idle time
const LOW_PRIORITY_ROUTES = ["/setup", "/compose"];

export function useRoutePreloading(currentPath: string) {
  const router = useRouter();

  // Preload a route with the Next.js router
  const preloadRoute = useCallback(
    (route: string) => {
      if (route !== currentPath && !route.startsWith("http")) {
        router.prefetch(route);
      }
    },
    [router, currentPath],
  );

  // Preload routes with different priorities
  useEffect(() => {
    // Immediately preload high-priority routes
    HIGH_PRIORITY_ROUTES.forEach((route) => {
      preloadRoute(route);
    });

    // Preload medium-priority routes after a short delay
    const mediumPriorityTimer = setTimeout(() => {
      MEDIUM_PRIORITY_ROUTES.forEach((route) => {
        preloadRoute(route);
      });
    }, 200);

    // Preload low-priority routes during idle time or after a longer delay
    const lowPriorityTimer = setTimeout(() => {
      if ("requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => {
          LOW_PRIORITY_ROUTES.forEach((route) => {
            preloadRoute(route);
          });
        });
      } else {
        LOW_PRIORITY_ROUTES.forEach((route) => {
          preloadRoute(route);
        });
      }
    }, 1000);

    return () => {
      clearTimeout(mediumPriorityTimer);
      clearTimeout(lowPriorityTimer);
    };
  }, [preloadRoute, currentPath]);

  // Function to manually preload a specific route
  const preload = useCallback(
    (route: string) => {
      preloadRoute(route);
    },
    [preloadRoute],
  );

  return { preload };
}
