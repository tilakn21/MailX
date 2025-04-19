"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { MessageText } from "@/components/Typography";
import { getGmailUrl } from "@/utils/url";
import { decodeSnippet } from "@/utils/gmail/decode";
import { ViewEmailButton } from "@/components/ViewEmailButton";
import { useThread } from "@/hooks/useThread";
import { snippetRemoveReply } from "@/utils/gmail/snippet";
import { extractNameFromEmail } from "@/utils/email";
import { Badge } from "@/components/ui/badge";
import { useGmail } from "@/providers/GmailProvider";
import { useMemo } from "react";
import { isDefined } from "@/utils/types";
import {
  NEEDS_REPLY_LABEL_NAME,
  AWAITING_REPLY_LABEL_NAME,
} from "@/utils/reply-tracker/consts";

export function EmailMessageCell({
  sender,
  userEmail,
  subject,
  snippet,
  threadId,
  messageId,
  hideViewEmailButton,
  labelIds,
  filterReplyTrackerLabels,
}: {
  sender: string;
  userEmail: string;
  subject: string;
  snippet: string;
  threadId: string;
  messageId: string;
  hideViewEmailButton?: boolean;
  labelIds?: string[];
  filterReplyTrackerLabels?: boolean;
}) {
  const { userLabels } = useGmail();

  const labelsToDisplay = useMemo(() => {
    const labels = labelIds
      ?.map((id) => {
        const label = userLabels[id];
        if (!label) return null;
        return { id, name: label.name };
      })
      .filter(isDefined)
      .filter((label) => {
        if (filterReplyTrackerLabels) {
          if (
            label.name === NEEDS_REPLY_LABEL_NAME ||
            label.name === AWAITING_REPLY_LABEL_NAME
          ) {
            return false;
          }
        }

        if (label.name.includes("/")) {
          return false;
        }
        return true;
      });

    if (labelIds && !labelIds.includes("INBOX")) {
      labels?.unshift({ id: "ARCHIVE", name: "Archived" });
    }

    return labels;
  }, [labelIds, userLabels, filterReplyTrackerLabels]);

  return (
    <div className="min-w-0 break-words">
      <MessageText className="flex items-center">
        <span className="max-w-[300px] truncate">
          {extractNameFromEmail(sender)}
        </span>{" "}
        <Link
          className="ml-2 hover:text-foreground"
          href={getGmailUrl(messageId, userEmail)}
          target="_blank"
        >
          <ExternalLinkIcon className="h-4 w-4" />
        </Link>
        {!hideViewEmailButton && (
          <ViewEmailButton
            threadId={threadId}
            messageId={messageId}
            size="xs"
            className="ml-1.5"
          />
        )}
        {labelsToDisplay && labelsToDisplay.length > 0 && (
          <div className="ml-2 flex flex-wrap items-center gap-1">
            {labelsToDisplay.map((label) => (
              <Badge variant="secondary" key={label.id}>
                {label.name}
              </Badge>
            ))}
          </div>
        )}
      </MessageText>
      <MessageText className="mt-1 font-bold">{subject}</MessageText>
      <MessageText className="mt-1">
        {snippetRemoveReply(decodeSnippet(snippet)).trim()}
      </MessageText>
    </div>
  );
}

export function EmailMessageCellWithData({
  sender,
  userEmail,
  threadId,
  messageId,
}: {
  sender: string;
  userEmail: string;
  threadId: string;
  messageId: string;
}) {
  const { data, isLoading, error } = useThread({ id: threadId });

  const firstMessage = data?.thread.messages?.[0];

  return (
    <EmailMessageCell
      sender={sender}
      userEmail={userEmail}
      subject={
        error
          ? "Error loading email"
          : isLoading
            ? "Loading email..."
            : firstMessage?.headers.subject || ""
      }
      snippet={error ? "" : isLoading ? "" : firstMessage?.snippet || ""}
      threadId={threadId}
      messageId={messageId}
      labelIds={firstMessage?.labelIds}
    />
  );
}
