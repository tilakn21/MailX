"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import Link from "next/link";
import { HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionDescription } from "@/components/Typography";
import type { ThreadsResponse } from "@/app/api/google/threads/controller";
import type { ThreadsQuery } from "@/app/api/google/threads/validation";
import type { ThreadWithPayloadMessages } from "@/utils/types";
import { LoadingContent } from "@/components/LoadingContent";
import { runAiRules } from "@/utils/queue/email-actions";
import { sleep } from "@/utils/sleep";
import { ExtraAlertWithData, useExtra } from "@/components/ExtraAlert";
import { SetDateDropdown } from "@/app/(app)/automation/SetDateDropdown";
import { dateToSeconds } from "@/utils/date";
import useSWR from "swr";
import { useAiQueueState } from "@/store/ai-queue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const BulkRunRules = memo(function BulkRunRules() {
  const [isOpen, setIsOpen] = useState(false);
  const [totalThreads, setTotalThreads] = useState(0);

  // Only fetch data when dialog is open to improve performance
  const { data, isLoading, error } = useSWR<ThreadsResponse>(
    isOpen
      ? `/api/google/threads?${new URLSearchParams({ type: "inbox" }).toString()}`
      : null,
    {
      suspense: false,
      revalidateOnFocus: false,
      dedupingInterval: 10000, // Avoid excessive refetching
    },
  );

  const queue = useAiQueueState();

  const { hasAiAccess, isLoading: isLoadingextra } = useExtra();

  const [running, setRunning] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const abortRef = useRef<(() => void) | undefined>(undefined);

  // Reset total threads when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTotalThreads(0);
    }
  }, [isOpen]);

  // Memoize the increment function to avoid unnecessary rerenders
  const incrementThreadsQueued = useCallback((count: number) => {
    setTotalThreads((total) => total + count);
  }, []);

  // Memoize the complete function
  const handleComplete = useCallback(() => {
    setRunning(false);
  }, []);

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" Icon={HistoryIcon}>
            Bulk Process Emails
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Existing Inbox Emails</DialogTitle>
          </DialogHeader>
          <LoadingContent loading={isLoading} error={error}>
            {data && data.threads && (
              <>
                <SectionDescription>
                  This runs your rules on emails currently in your inbox (that
                  have not been previously processed).
                </SectionDescription>

                {!!queue.size && (
                  <div className="rounded-md border border-green-200 bg-green-50 px-2 py-1.5 dark:border-green-800 dark:bg-green-950">
                    <SectionDescription className="mt-0">
                      Progress: {totalThreads - queue.size}/{totalThreads}{" "}
                      emails completed
                    </SectionDescription>
                  </div>
                )}
                <div className="space-y-4">
                  <LoadingContent loading={isLoadingextra}>
                    {hasAiAccess ? (
                      <div className="flex flex-col space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <SetDateDropdown
                            onChange={setStartDate}
                            value={startDate}
                            placeholder="Set start date"
                            disabled={running}
                          />
                          <SetDateDropdown
                            onChange={setEndDate}
                            value={endDate}
                            placeholder="Set end date (optional)"
                            disabled={running}
                          />
                        </div>

                        <Button
                          type="button"
                          disabled={running || !startDate}
                          loading={running}
                          onClick={async () => {
                            if (!startDate) return;
                            setRunning(true);
                            abortRef.current = await onRun(
                              { startDate, endDate },
                              incrementThreadsQueued,
                              handleComplete,
                            );
                          }}
                        >
                          Process Emails
                        </Button>
                        {running && (
                          <Button
                            variant="outline"
                            onClick={() => abortRef.current?.()}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ExtraAlertWithData />
                    )}
                  </LoadingContent>

                  <SectionDescription>
                    You can also process specific emails by visiting the{" "}
                    <Link
                      href="/mail"
                      target="_blank"
                      className="font-semibold hover:underline"
                    >
                      Mail
                    </Link>{" "}
                    page.
                  </SectionDescription>
                </div>
              </>
            )}
          </LoadingContent>
        </DialogContent>
      </Dialog>
    </div>
  );
});

// fetch batches of messages and add them to the ai queue
async function onRun(
  { startDate, endDate }: { startDate: Date; endDate?: Date },
  incrementThreadsQueued: (count: number) => void,
  onComplete: () => void,
): Promise<() => void> {
  let nextPageToken = "";
  const LIMIT = 25;
  const MAX_ITERATIONS = 100;

  const startDateInSeconds = dateToSeconds(startDate);
  const endDateInSeconds = endDate ? dateToSeconds(endDate) : "";
  const q = `after:${startDateInSeconds} ${
    endDate ? `before:${endDateInSeconds}` : ""
  }`;

  let aborted = false;

  function abort() {
    aborted = true;
  }

  async function run() {
    try {
      for (let i = 0; i < MAX_ITERATIONS && !aborted; i++) {
        const query: ThreadsQuery = {
          type: "inbox",
          nextPageToken,
          limit: LIMIT,
          q,
        };

        try {
          const res = await fetch(
            `/api/google/threads?${new URLSearchParams(query as Record<string, string>).toString()}`,
            { headers: { "Content-Type": "application/json" } },
          );

          if (!res.ok) {
            console.error(
              `Error fetching threads: ${res.status} ${res.statusText}`,
            );
            break;
          }

          const data: ThreadsResponse = await res.json();
          nextPageToken = data.nextPageToken || "";

          // Skip processing if no threads or if aborted
          if (!data.threads?.length || aborted) {
            if (!nextPageToken) break;
            continue;
          }

          const threadsWithoutPlan = data.threads.filter((t: any) => !t.plan);

          if (threadsWithoutPlan.length > 0) {
            incrementThreadsQueued(threadsWithoutPlan.length);
            runAiRules(threadsWithoutPlan, false);
          }

          if (!nextPageToken) break;

          // Adaptive sleep based on thread count to avoid rate limits
          // but ensure we don't wait too long for small batches
          const sleepTime = Math.min(
            Math.max(threadsWithoutPlan.length * 200, 2000),
            5000,
          );
          await sleep(sleepTime);
        } catch (error) {
          console.error("Error processing batch:", error);
          // Continue to next batch despite errors
          await sleep(3000); // Wait a bit longer after an error
        }
      }
    } catch (error) {
      console.error("Fatal error in bulk processing:", error);
    } finally {
      onComplete();
    }
  }

  // Start processing asynchronously and handle any errors
  const runPromise = run().catch((error) => {
    console.error("Unhandled error in bulk processing:", error);
    onComplete();
  });

  // For debugging
  runPromise.then(() => {
    console.log("Bulk processing completed successfully");
  });

  return abort;
}
