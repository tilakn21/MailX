"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useNavigation as useNavigationContext } from "@/providers/NavigationProvider";
import {
  ArrowLeftIcon,
  BarChartBigIcon,
  CogIcon,
  InboxIcon,
  type LucideIcon,
  MailsIcon,
  MessageCircleReplyIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarGroup,
  SidebarHeader,
  SidebarGroupContent,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { SideNavMenu } from "@/components/SideNavMenu";
import { useCleanerEnabled } from "@/hooks/useFeatureFlags";
import { ClientOnly } from "@/components/ClientOnly";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon | ((props: any) => React.ReactNode);
  target?: "_blank";
  count?: number;
  hideInMail?: boolean;
};

// Assistant category items
const assistantItems: NavItem[] = [
  {
    name: "Mail",
    href: "/mail",
    icon: InboxIcon,
  },
  {
    name: "AssistantX",
    href: "/automation",
    icon: SparklesIcon,
  },
  {
    name: "Focused Reply",
    href: "/reply-zero",
    icon: MessageCircleReplyIcon,
  },
  {
    name: "Cold Email Blocker",
    href: "/cold-email-blocker",
    icon: ShieldCheckIcon,
  },
];

// Clean category items
const cleanItems: NavItem[] = [
  {
    name: "Bulk Unsubscribe",
    href: "/bulk-unsubscribe",
    icon: MailsIcon,
  },
  {
    name: "Insights",
    href: "/stats",
    icon: BarChartBigIcon,
  },
];

export const useAppNavigation = () => {
  // When we have features in early access, we can filter the navigation items
  const showCleaner = useCleanerEnabled();

  const cleanItemsFiltered = useMemo(
    () =>
      cleanItems.filter((item) => {
        if (item.href === "/clean") return showCleaner;
        return true;
      }),
    [showCleaner],
  );

  return {
    assistantItems,
    cleanItems: cleanItemsFiltered,
  };
};

const bottomLinks: NavItem[] = [
  { name: "Settings", href: "/settings", icon: CogIcon },
];

// Dynamically import MailNav with loading fallback for better performance
const DynamicMailNav = dynamic(
  () => import("./MailNav").then((mod) => mod.default),
  {
    loading: () => (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        Loading mail navigation...
      </div>
    ),
    ssr: false,
  },
);

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigation = useAppNavigation();
  const { preloadRoute } = useNavigationContext();
  const path = usePathname();
  const showMailNav = path === "/mail" || path === "/compose";

  // Preload routes when component mounts
  useMemo(() => {
    // Preload main navigation routes for faster access
    ["/mail", "/automation", "/stats"].forEach((route) => {
      if (path !== route) {
        preloadRoute(route);
      }
    });
  }, [preloadRoute, path]);

  const visibleBottomLinks = useMemo(
    () =>
      showMailNav
        ? [
            {
              name: "Back",
              href: "/automation",
              icon: ArrowLeftIcon,
            },
            ...bottomLinks.filter((l) => !l.hideInMail),
          ]
        : bottomLinks,
    [showMailNav],
  );

  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      {state === "expanded" ? (
        <SidebarHeader>
          <Link href="/setup">
            <div className="flex h-12 items-center p-4 text-white">
              <span>MailX </span>
            </div>
          </Link>
        </SidebarHeader>
      ) : null}

      <SidebarContent>
        <SidebarGroupContent>
          {showMailNav ? (
            <DynamicMailNav path={path} />
          ) : (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>Assistant</SidebarGroupLabel>
                <SideNavMenu
                  items={navigation.assistantItems}
                  activeHref={path}
                />
              </SidebarGroup>
              <SidebarGroup>
                <SidebarGroupLabel>Clean</SidebarGroupLabel>
                <ClientOnly>
                  <SideNavMenu
                    items={navigation.cleanItems}
                    activeHref={path}
                  />
                </ClientOnly>
              </SidebarGroup>
            </>
          )}
        </SidebarGroupContent>
      </SidebarContent>

      <SidebarFooter className="pb-4">
        <SideNavMenu items={visibleBottomLinks} activeHref={path} />
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
    </Sidebar>
  );
}
