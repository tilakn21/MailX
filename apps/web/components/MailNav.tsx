"use client";

import { useMemo, useState } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PenIcon,
  TagIcon,
  InboxIcon,
  FileIcon,
  SendIcon,
  ArchiveIcon,
  PersonStandingIcon,
  Users2Icon,
  AlertCircleIcon,
  MessagesSquareIcon,
  RatioIcon,
} from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SideNavMenu } from "@/components/SideNavMenu";
import { CommandShortcut } from "@/components/ui/command";
import { useSplitLabels } from "@/hooks/useLabels";
import { LoadingContent } from "@/components/LoadingContent";
import { useComposeModal } from "@/providers/ComposeModalProvider";

// Mail navigation links
const topMailLinks = [
  {
    name: "Inbox",
    icon: InboxIcon,
    href: "?type=inbox",
  },
  {
    name: "Drafts",
    icon: FileIcon,
    href: "?type=draft",
  },
  {
    name: "Sent",
    icon: SendIcon,
    href: "?type=sent",
  },
  {
    name: "Archived",
    icon: ArchiveIcon,
    href: "?type=archive",
  },
];

const bottomMailLinks = [
  {
    name: "Personal",
    icon: PersonStandingIcon,
    href: "?type=CATEGORY_PERSONAL",
  },
  {
    name: "Social",
    icon: Users2Icon,
    href: "?type=CATEGORY_SOCIAL",
  },
  {
    name: "Updates",
    icon: AlertCircleIcon,
    href: "?type=CATEGORY_UPDATES",
  },
  {
    name: "Forums",
    icon: MessagesSquareIcon,
    href: "?type=CATEGORY_FORUMS",
  },
  {
    name: "Promotions",
    icon: RatioIcon,
    href: "?type=CATEGORY_PROMOTIONS",
  },
];

// Default export for dynamic loading
export default function MailNav({ path }: { path: string }) {
  const { onOpen } = useComposeModal();
  const [showHiddenLabels, setShowHiddenLabels] = useState(false);
  const { visibleLabels, hiddenLabels, isLoading } = useSplitLabels();

  // Transform user labels into NavItems
  const labelNavItems = useMemo(() => {
    const searchParams = new URLSearchParams(path.split("?")[1] || "");
    const currentLabelId = searchParams.get("labelId");

    return visibleLabels.map((label) => ({
      name: label.name,
      icon: TagIcon,
      href: `?type=label&labelId=${encodeURIComponent(label.id)}`,
      // Add active state for the current label
      active: currentLabelId === label.id,
    }));
  }, [visibleLabels, path]);

  // Transform hidden labels into NavItems
  const hiddenLabelNavItems = useMemo(() => {
    const searchParams = new URLSearchParams(path.split("?")[1] || "");
    const currentLabelId = searchParams.get("labelId");

    return hiddenLabels.map((label) => ({
      name: label.name,
      icon: TagIcon,
      href: `?type=label&labelId=${encodeURIComponent(label.id)}`,
      // Add active state for the current label
      active: currentLabelId === label.id,
    }));
  }, [hiddenLabels, path]);

  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-9 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              onClick={onOpen}
            >
              <PenIcon className="size-4" />
              <span className="truncate font-semibold">Compose</span>
              <CommandShortcut>C</CommandShortcut>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup>
        <SideNavMenu items={topMailLinks} activeHref={path} />
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Categories</SidebarGroupLabel>
        <SideNavMenu items={bottomMailLinks} activeHref={path} />
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Labels</SidebarGroupLabel>
        <LoadingContent loading={isLoading}>
          {visibleLabels.length > 0 ? (
            <SideNavMenu items={labelNavItems} activeHref={path} />
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No labels
            </div>
          )}

          {/* Hidden labels toggle */}
          {hiddenLabels.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowHiddenLabels(!showHiddenLabels)}
                className="flex w-full items-center px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {showHiddenLabels ? (
                  <ChevronDownIcon className="mr-1 size-4" />
                ) : (
                  <ChevronRightIcon className="mr-1 size-4" />
                )}
                <span>More</span>
              </button>

              {showHiddenLabels && (
                <SideNavMenu items={hiddenLabelNavItems} activeHref={path} />
              )}
            </>
          )}
        </LoadingContent>
      </SidebarGroup>
    </>
  );
}
