"use client";

import { useCallback, useEffect, use, Suspense, lazy } from "react";
import useSWRInfinite from "swr/infinite";
import { useSetAtom } from "jotai";
import { List } from "@/components/email-list/EmailList";
import { LoadingContent } from "@/components/LoadingContent";
import type { ThreadsQuery } from "@/app/api/google/threads/validation";
import type { ThreadsResponse } from "@/app/api/google/threads/controller";
import { refetchEmailListAtom } from "@/store/email";
import { ClientOnly } from "@/components/ClientOnly";

// Lazy load permission check to improve initial load time
const PermissionsCheck = lazy(() =>
  import("@/app/(app)/PermissionsCheck").then((mod) => ({
    default: mod.PermissionsCheck,
  })),
);

export default function Mail(props: {
  searchParams: Promise<{ type?: string; labelId?: string }>;
}) {
  const searchParams = use(props.searchParams);
  const query: ThreadsQuery = {};

  // Set a smaller initial page size to improve first load time
  const initialPageSize = 20;

  // Handle different query params
  if (searchParams.type === "label" && searchParams.labelId) {
    query.labelId = searchParams.labelId;
  } else if (searchParams.type) {
    query.type = searchParams.type;
  }

  const getKey = (
    pageIndex: number,
    previousPageData: ThreadsResponse | null,
  ) => {
    if (previousPageData && !previousPageData.nextPageToken) return null;
    const queryParams = new URLSearchParams(query as Record<string, string>);

    // Set a smaller limit for the first page to improve initial load time
    if (pageIndex === 0) {
      queryParams.set("limit", initialPageSize.toString());
    } else {
      queryParams.set("limit", "30"); // Subsequent pages can load more
    }

    // Append nextPageToken for subsequent pages
    if (pageIndex > 0 && previousPageData?.nextPageToken) {
      queryParams.set("nextPageToken", previousPageData.nextPageToken);
    }

    return `/api/google/threads?${queryParams.toString()}`;
  };

  const { data, size, setSize, isLoading, error, mutate } =
    useSWRInfinite<ThreadsResponse>(getKey, {
      keepPreviousData: true,
      dedupingInterval: 1_000,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnMount: true,
      suspense: false,
      errorRetryCount: 2,
    });

  const allThreads = data ? data.flatMap((page) => page.threads) : [];
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const showLoadMore = data ? !!data[data.length - 1]?.nextPageToken : false;

  // store `refetch` in the atom so we can refresh the list upon archive via command k
  // TODO is this the best way to do this?
  const refetch = useCallback(
    (options?: { removedThreadIds?: string[] }) => {
      mutate(
        (currentData) => {
          if (!currentData) return currentData;
          if (!options?.removedThreadIds) return currentData;

          return currentData.map((page) => ({
            ...page,
            threads: page.threads.filter(
              (t) => !options?.removedThreadIds?.includes(t.id),
            ),
          }));
        },
        {
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        },
      );
    },
    [mutate],
  );

  // Set up the refetch function in the atom store
  const setRefetchEmailList = useSetAtom(refetchEmailListAtom);
  useEffect(() => {
    setRefetchEmailList({ refetch });
  }, [refetch, setRefetchEmailList]);

  const handleLoadMore = useCallback(() => {
    setSize((size) => size + 1);
  }, [setSize]);

  return (
    <>
      <Suspense fallback={null}>
        <PermissionsCheck />
      </Suspense>

      <LoadingContent loading={isLoading && !data} error={error}>
        {allThreads && (
          <List
            emails={allThreads}
            refetch={refetch}
            type={searchParams.type}
            showLoadMore={showLoadMore}
            handleLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
          />
        )}
      </LoadingContent>
    </>
  );
}
