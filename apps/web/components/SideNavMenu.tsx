"use client";

import { useCallback, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useNavigation } from "@/providers/NavigationProvider";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon | ((props: any) => React.ReactNode);
  target?: "_blank";
  count?: number;
  hideInMail?: boolean;
  active?: boolean;
};

// Memoize the SideNavMenu component to prevent unnecessary re-renders
const SideNavMenu = memo(function SideNavMenu({
  items,
  activeHref,
}: {
  items: NavItem[];
  activeHref: string;
}) {
  const pathname = usePathname();
  const { navigateTo, preloadRoute, isNavigating, currentRoute } =
    useNavigation();

  // Preload routes when hovering over menu items
  const handleMouseEnter = useCallback(
    (href: string) => {
      // Extract the base path without query parameters
      const basePath = href.split("?")[0];
      if (basePath && !href.startsWith("http")) {
        preloadRoute(basePath);
      }
    },
    [preloadRoute],
  );

  // Handle navigation with the navigation context
  const handleNavigation = useCallback(
    (e: React.MouseEvent, href: string) => {
      e.preventDefault();

      // For external links or links with target="_blank", use default behavior
      if (href.startsWith("http") || href.startsWith("https")) {
        window.open(href, "_blank");
        return;
      }

      // Use the navigation context for client-side navigation
      navigateTo(href);
    },
    [navigateTo],
  );

  return (
    <SidebarMenu>
      {items.map((item) => {
        const isActive = item.active || activeHref === item.href;
        const isLoading = isNavigating && currentRoute !== item.href;

        return (
          <SidebarMenuItem key={item.name} className="font-semibold">
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className="h-9"
              tooltip={item.name}
            >
              <Link
                href={item.href}
                onClick={(e) => handleNavigation(e, item.href)}
                onMouseEnter={() => handleMouseEnter(item.href)}
                prefetch={false} // We handle prefetching manually
                target={item.target}
              >
                <item.icon className={isLoading ? "animate-pulse" : ""} />
                <span className="transition-opacity duration-75">
                  {item.name}
                </span>
                {item.count !== undefined && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {item.count}
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
});

export { SideNavMenu };
