"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeading, TypographyP } from "@/components/Typography";
import { LoadingContent } from "@/components/LoadingContent";
import type { DraftActionsResponse } from "@/app/api/user/draft-actions/route";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShortDate } from "@/utils/date";
import { getGmailUrl } from "@/utils/url";
import { Badge } from "@/components/ui/badge";
import { useMessagesBatch } from "@/hooks/useMessagesBatch";
import { LoadingMiniSpinner } from "@/components/Loading";
import { isDefined } from "@/utils/types";

export default function DebugDraftsPage() {
  const { data, isLoading, error } = useSWR<DraftActionsResponse>(
    "/api/user/draft-actions",
  );

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    error: messagesError,
  } = useMessagesBatch({
    ids: data?.executedActions
      .map((executedAction) => executedAction.draftSendLog?.sentMessageId)
      .filter(isDefined),
    parseReplies: true,
  });

  const session = useSession();
  const userEmail = session.data?.user?.email || "";

  return (
    <div className="container mx-auto py-6">
      <PageHeading className="mb-6">Drafts</PageHeading>

      <LoadingContent loading={isLoading} error={error}>
        {data?.executedActions.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center p-6">
              <TypographyP>No draft actions found yet.</TypographyP>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>View</TableHead>
                  <TableHead>Drafted</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Similarity Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
                {data?.executedActions?.map((executedAction) => (
                  <TableRow key={executedAction.id}>
                    <TableCell>
                      <Badge
                        variant={
                          executedAction.wasDraftSent ? "default" : "secondary"
                        }
                      >
                        {executedAction.wasDraftSent ? "Sent" : "Not Sent"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {executedAction.wasDraftSent &&
                      executedAction.draftSendLog?.sentMessageId ? (
                        <Link
                          href={getGmailUrl(
                            executedAction.draftSendLog.sentMessageId,
                            userEmail,
                          )}
                          target="_blank"
                          className="text-blue-500 hover:text-blue-600"
                        >
                          Sent Email
                        </Link>
                      ) : executedAction.draftId ? (
                        <Link
                          href={getGmailUrl(executedAction.draftId, userEmail)}
                          target="_blank"
                          className="text-blue-500 hover:text-blue-600"
                        >
                          Draft
                        </Link>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TypographyP>{executedAction.content}</TypographyP>
                    </TableCell>
                    <TableCell>
                      <LoadingContent
                        loading={isMessagesLoading}
                        error={messagesError}
                        loadingComponent={<LoadingMiniSpinner />}
                      >
                        <TypographyP>
                          {messagesData?.messages.find(
                            (message) =>
                              message.id ===
                              executedAction.draftSendLog?.sentMessageId,
                          )?.textPlain || "-"}
                        </TypographyP>
                      </LoadingContent>
                    </TableCell>
                    <TableCell>
                      {executedAction.draftSendLog?.similarityScore !== null
                        ? executedAction.draftSendLog?.similarityScore.toFixed(
                            2,
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {formatShortDate(new Date(executedAction.createdAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableHeader>
            </Table>
          </Card>
        )}
      </LoadingContent>
    </div>
  );
}
