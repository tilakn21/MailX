"use client";

import type React from "react";
import clsx from "clsx";
import useSWR from "swr";
import {
  ArchiveIcon,
  ArchiveXIcon,
  BadgeCheckIcon,
  ChevronDown,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ExpandIcon,
  ExternalLinkIcon,
  MailMinusIcon,
  MoreHorizontalIcon,
  PlusCircle,
  TagIcon,
  TrashIcon,
} from "lucide-react";
import { type PostHog, usePostHog } from "posthog-js/react";
import { Button } from "@/components/ui/button";
import { ButtonLoader } from "@/components/Loading";
import { Tooltip } from "@/components/Tooltip";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExtraTooltip, ExtraTooltipContent } from "@/components/ExtraAlert";
import { GroupItemType, NewsletterStatus } from "@prisma/client";
import type { GroupsResponse } from "@/app/api/user/group/route";
import { addGroupItemAction } from "@/utils/actions/group";
import { toastError, toastSuccess } from "@/components/Toast";
import { createFilterAction } from "@/utils/actions/mail";
import { isActionError } from "@/utils/error";
import { getGmailSearchUrl } from "@/utils/url";
import type { Row } from "@/app/(app)/bulk-unsubscribe/types";
import {
  useUnsubscribe,
  useAutoArchive,
  useApproveButton,
  useArchiveAll,
  useDeleteAllFromSender,
} from "@/app/(app)/bulk-unsubscribe/hooks";
import { LabelsSubMenu } from "@/components/LabelsSubMenu";
import type { UserLabel } from "@/hooks/useLabels";

export function ActionCell<T extends Row>({
  item,
  hasUnsubscribeAccess,
  mutate,
  refetchextra,
  onOpenNewsletter,
  labels,
  openExtraModal,
  userEmail,
}: {
  item: T;
  hasUnsubscribeAccess: boolean;
  mutate: () => Promise<void>;
  refetchextra: () => Promise<any>;
  onOpenNewsletter: (row: T) => void;
  selected: boolean;
  labels: UserLabel[];
  openExtraModal: () => void;
  userEmail: string;
}) {
  const posthog = usePostHog();

  return (
    <>
      <ExtraTooltip
        showTooltip={!hasUnsubscribeAccess}
        openModal={openExtraModal}
      >
        <UnsubscribeButton
          item={item}
          hasUnsubscribeAccess={hasUnsubscribeAccess}
          mutate={mutate}
          posthog={posthog}
          refetchextra={refetchextra}
        />
      </ExtraTooltip>
      <Tooltip
        contentComponent={
          !hasUnsubscribeAccess ? (
            <ExtraTooltipContent openModal={openExtraModal} />
          ) : undefined
        }
        content={
          hasUnsubscribeAccess
            ? "Auto archive emails using Gmail filters."
            : undefined
        }
      >
        <AutoArchiveButton
          item={item}
          hasUnsubscribeAccess={hasUnsubscribeAccess}
          mutate={mutate}
          posthog={posthog}
          refetchextra={refetchextra}
          labels={labels}
        />
      </Tooltip>
      <Tooltip
        contentComponent={
          !hasUnsubscribeAccess ? (
            <ExtraTooltipContent openModal={openExtraModal} />
          ) : undefined
        }
        content={
          hasUnsubscribeAccess
            ? "Approve to filter it from the list."
            : undefined
        }
      >
        <ApproveButton
          item={item}
          hasUnsubscribeAccess={hasUnsubscribeAccess}
          mutate={mutate}
          posthog={posthog}
        />
      </Tooltip>
      <MoreDropdown
        onOpenNewsletter={onOpenNewsletter}
        item={item}
        userEmail={userEmail}
        labels={labels}
        posthog={posthog}
      />
    </>
  );
}

function UnsubscribeButton<T extends Row>({
  item,
  hasUnsubscribeAccess,
  mutate,
  posthog,
  refetchextra,
}: {
  item: T;
  hasUnsubscribeAccess: boolean;
  mutate: () => Promise<void>;
  refetchextra: () => Promise<any>;
  posthog: PostHog;
}) {
  const { unsubscribeLoading, onUnsubscribe, unsubscribeLink } = useUnsubscribe(
    {
      item,
      hasUnsubscribeAccess,
      mutate,
      posthog,
      refetchextra,
    },
  );

  const hasUnsubscribeLink = unsubscribeLink !== "#";

  return (
    <Button
      size="sm"
      variant={
        item.status === NewsletterStatus.UNSUBSCRIBED ? "red" : "secondary"
      }
      asChild
    >
      <a
        href={unsubscribeLink}
        target={hasUnsubscribeLink ? "_blank" : undefined}
        onClick={onUnsubscribe}
        rel="noreferrer noopener"
      >
        {unsubscribeLoading && <ButtonLoader />}
        <span className="hidden xl:block">
          {hasUnsubscribeLink ? "Unsubscribe" : "Block"}
        </span>
        <span className="block xl:hidden">
          <Tooltip content={hasUnsubscribeLink ? "Unsubscribe" : "Block"}>
            <MailMinusIcon className="size-4" />
          </Tooltip>
        </span>
      </a>
    </Button>
  );
}

function AutoArchiveButton<T extends Row>({
  item,
  hasUnsubscribeAccess,
  mutate,
  posthog,
  refetchextra,
  labels,
}: {
  item: T;
  hasUnsubscribeAccess: boolean;
  mutate: () => Promise<void>;
  posthog: PostHog;
  refetchextra: () => Promise<any>;
  labels: UserLabel[];
}) {
  const {
    autoArchiveLoading,
    onAutoArchive,
    onAutoArchiveAndLabel,
    onDisableAutoArchive,
  } = useAutoArchive({
    item,
    hasUnsubscribeAccess,
    mutate,
    posthog,
    refetchextra,
  });

  return (
    <div
      className={clsx(
        "flex h-min items-center gap-1 rounded-md text-secondary-foreground",
        item.autoArchived ? "bg-blue-100 dark:bg-blue-800" : "bg-secondary",
      )}
    >
      <Button
        variant={
          item.status === NewsletterStatus.AUTO_ARCHIVED || item.autoArchived
            ? "blue"
            : "secondary"
        }
        className="px-3 shadow-none"
        size="sm"
        onClick={onAutoArchive}
        disabled={!hasUnsubscribeAccess}
      >
        {autoArchiveLoading && <ButtonLoader />}
        <span className="hidden xl:block">Auto Archive</span>
        <span className="block xl:hidden">
          <Tooltip content="Auto Archive">
            <ArchiveIcon className="size-4" />
          </Tooltip>
        </span>
      </Button>
      <Separator orientation="vertical" className="h-[20px]" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={
              item.status === NewsletterStatus.AUTO_ARCHIVED ||
              item.autoArchived
                ? "blue"
                : "secondary"
            }
            className="px-2 shadow-none"
            size="sm"
            disabled={!hasUnsubscribeAccess}
          >
            <ChevronDownIcon className="size-4 text-secondary-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          alignOffset={-5}
          className="max-h-[415px] w-[220px] overflow-auto"
          forceMount
          onKeyDown={(e) => {
            e.stopPropagation();
          }}
        >
          {item.autoArchived?.id && (
            <>
              <DropdownMenuItem
                onClick={async () => {
                  posthog.capture("Clicked Disable Auto Archive");
                  onDisableAutoArchive();
                }}
              >
                <ArchiveXIcon className="mr-2 size-4" /> Disable Auto Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuLabel>Auto Archive and Label</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {labels.map((label) => {
            return (
              <DropdownMenuItem
                key={label.id}
                onClick={async () => {
                  posthog.capture("Clicked Auto Archive and Label");
                  await onAutoArchiveAndLabel(label.id!);
                }}
              >
                {label.name}
              </DropdownMenuItem>
            );
          })}
          {!labels.length && (
            <DropdownMenuItem>
              You do not have any labels. Create one in Gmail first to auto
              label emails.
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ApproveButton<T extends Row>({
  item,
  hasUnsubscribeAccess,
  mutate,
  posthog,
}: {
  item: T;
  hasUnsubscribeAccess: boolean;
  mutate: () => Promise<void>;
  posthog: PostHog;
}) {
  const { approveLoading, onApprove } = useApproveButton({
    item,
    mutate,
    posthog,
  });

  return (
    <Button
      size="sm"
      variant={
        item.status === NewsletterStatus.APPROVED ? "green" : "secondary"
      }
      onClick={onApprove}
      disabled={!hasUnsubscribeAccess}
      loading={approveLoading}
    >
      <span className="hidden 2xl:block">Keep</span>
      <span className="block 2xl:hidden">
        <Tooltip content="Keep">
          <BadgeCheckIcon className="size-4" />
        </Tooltip>
      </span>
    </Button>
  );
}

export function MoreDropdown<T extends Row>({
  onOpenNewsletter,
  item,
  userEmail,
  labels,
  posthog,
}: {
  onOpenNewsletter?: (row: T) => void;
  item: T;
  userEmail: string;
  labels: UserLabel[];
  posthog: PostHog;
}) {
  const { archiveAllLoading, onArchiveAll } = useArchiveAll({
    item,
    posthog,
  });
  const { deleteAllLoading, onDeleteAll } = useDeleteAllFromSender({
    item,
    posthog,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-haspopup="true" size="icon" variant="ghost">
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!!onOpenNewsletter && (
          <DropdownMenuItem onClick={() => onOpenNewsletter(item)}>
            <ExpandIcon className="mr-2 size-4" />
            <span>View stats</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href={getGmailSearchUrl(item.name, userEmail)} target="_blank">
            <ExternalLinkIcon className="mr-2 size-4" />
            <span>View in Gmail</span>
          </a>
        </DropdownMenuItem>

        {/* <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserPlus className="mr-2 size-4" />
            <span>Add sender to rule</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <GroupsSubMenu sender={item.name} />
          </DropdownMenuPortal>
        </DropdownMenuSub> */}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <TagIcon className="mr-2 size-4" />
            <span>Label future emails</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <LabelsSubMenu
              labels={labels}
              onClick={async (label) => {
                const res = await createFilterAction(item.name, label.id);
                if (isActionError(res)) {
                  toastError({
                    title: "Error",
                    description: `Failed to add ${item.name} to ${label.name}. ${res.error}`,
                  });
                } else {
                  toastSuccess({
                    title: "Success!",
                    description: `Added ${item.name} to ${label.name}`,
                  });
                }
              }}
            />
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuItem onClick={onArchiveAll}>
          {archiveAllLoading ? (
            <ButtonLoader />
          ) : (
            <ArchiveIcon className="mr-2 size-4" />
          )}
          <span>Archive all</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            const yes = confirm(
              `Are you sure you want to delete all emails from ${item.name}?`,
            );
            if (!yes) return;

            onDeleteAll();
          }}
        >
          {deleteAllLoading ? (
            <ButtonLoader />
          ) : (
            <TrashIcon className="mr-2 size-4" />
          )}
          <span>Delete all</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function HeaderButton(props: {
  children: React.ReactNode;
  sorted: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={props.onClick}
    >
      <span>{props.children}</span>
      {props.sorted ? (
        <ChevronDown className="ml-2 size-4" />
      ) : (
        <ChevronsUpDownIcon className="ml-2 size-4" />
      )}
    </Button>
  );
}

function GroupsSubMenu({ sender }: { sender: string }) {
  const { data, isLoading, error } = useSWR<GroupsResponse>("/api/user/group");

  return (
    <DropdownMenuSubContent>
      {data &&
        (data.groups.length ? (
          data?.groups.map((group) => {
            return (
              <DropdownMenuItem
                key={group.id}
                onClick={async () => {
                  const result = await addGroupItemAction({
                    groupId: group.id,
                    type: GroupItemType.FROM,
                    value: sender,
                  });

                  if (isActionError(result)) {
                    toastError({
                      description: `Failed to add ${sender} to ${group.name}. ${result.error}`,
                    });
                  } else {
                    toastSuccess({
                      title: "Success!",
                      description: `Added ${sender} to ${group.name}`,
                    });
                  }
                }}
              >
                {group.name}
              </DropdownMenuItem>
            );
          })
        ) : (
          <DropdownMenuItem>{`You don't have any groups yet.`}</DropdownMenuItem>
        ))}
      {isLoading && <DropdownMenuItem>Loading...</DropdownMenuItem>}
      {error && <DropdownMenuItem>Error loading groups</DropdownMenuItem>}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <a href="/automation?tab=groups" target="_blank">
          <PlusCircle className="mr-2 size-4" />
          <span>New Group</span>
        </a>
      </DropdownMenuItem>
    </DropdownMenuSubContent>
  );
}
