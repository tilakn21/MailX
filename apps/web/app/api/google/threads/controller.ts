import { parseMessages } from "@/utils/mail";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import { getGmailAccessToken, getGmailClient } from "@/utils/gmail/client";
import { GmailLabel } from "@/utils/gmail/label";
import { isDefined } from "@/utils/types";
import prisma from "@/utils/prisma";
import { getCategory } from "@/utils/redis/category";
import {
  getThreadsBatch,
  getThreadsWithNextPageToken,
} from "@/utils/gmail/thread";
import { decodeSnippet } from "@/utils/gmail/decode";
import type { ThreadsQuery } from "@/app/api/google/threads/validation";
import { ExecutedRuleStatus } from "@prisma/client";
import { SafeError } from "@/utils/error";
import { cache } from "react";

// Cache time in milliseconds
const CACHE_TTL = 60 * 1000; // 1 minute
const threadCache = new Map<string, { data: any; timestamp: number }>();

export type ThreadsResponse = Awaited<ReturnType<typeof getThreads>>;

// Create a cache key from the query parameters
function createCacheKey(query: ThreadsQuery, email: string): string {
  return `${email}-${JSON.stringify(query)}`;
}

export async function getThreads(query: ThreadsQuery) {
  const session = await auth();
  const email = session?.user.email;
  if (!email) throw new SafeError("Not authenticated");

  // Check cache first
  const cacheKey = createCacheKey(query, email);
  const cachedData = threadCache.get(cacheKey);
  const now = Date.now();

  if (cachedData && now - cachedData.timestamp < CACHE_TTL) {
    return cachedData.data;
  }

  // If not in cache or expired, fetch fresh data
  const gmail = getGmailClient(session);
  const token = await getGmailAccessToken(session);
  const accessToken = token?.token;

  if (!accessToken) throw new SafeError("Missing access token");

  function getQuery() {
    if (query.q) {
      return query.q;
    }
    if (query.fromEmail) {
      return `from:${query.fromEmail}`;
    }
    if (query.type === "archive") {
      return `-label:${GmailLabel.INBOX}`;
    }
    return undefined;
  }

  // Use a smaller batch size for initial load if specified in query
  const batchSize = query.limit || 50;

  const { threads: gmailThreads, nextPageToken } =
    await getThreadsWithNextPageToken({
      gmail,
      q: getQuery(),
      labelIds: query.labelId ? [query.labelId] : getLabelIds(query.type),
      maxResults: batchSize,
      pageToken: query.nextPageToken || undefined,
    });

  const threadIds = gmailThreads?.map((t) => t.id).filter(isDefined) || [];

  // Skip fetching plans if there are no threads
  if (threadIds.length === 0) {
    return { threads: [], nextPageToken };
  }

  const [threads, plans] = await Promise.all([
    getThreadsBatch(threadIds, accessToken),
    prisma.executedRule.findMany({
      where: {
        userId: session.user.id,
        threadId: { in: threadIds },
        status: {
          in: [ExecutedRuleStatus.PENDING, ExecutedRuleStatus.SKIPPED],
        },
      },
      select: {
        id: true,
        messageId: true,
        threadId: true,
        rule: true,
        actionItems: true,
        status: true,
        reason: true,
      },
    }),
  ]);

  // Process threads in parallel with optimized category fetching
  const categoryPromises = threads
    .filter((thread) => thread.id)
    .map((thread) => getCategory({ email, threadId: thread.id! }));

  // Fetch all categories in parallel
  const categories = await Promise.all(categoryPromises);

  // Map threads to their processed form without awaiting in the map function
  const threadsWithMessages = threads
    .map((thread, index) => {
      const id = thread.id;
      if (!id) return undefined;

      const messages = parseMessages(thread, { withoutIgnoredSenders: true });
      const plan = plans.find((p) => p.threadId === id);

      return {
        id,
        messages,
        snippet: decodeSnippet(thread.snippet),
        plan,
        category: categories[index],
      };
    })
    .filter(isDefined);

  const result = {
    threads: threadsWithMessages,
    nextPageToken,
  };

  // Store in cache
  threadCache.set(cacheKey, { data: result, timestamp: now });

  // Clean up old cache entries
  if (threadCache.size > 100) {
    const keysToDelete = [];
    for (const [key, value] of threadCache.entries()) {
      if (now - value.timestamp > CACHE_TTL * 2) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => threadCache.delete(key));
  }

  return result;
}

function getLabelIds(type?: string | null) {
  switch (type) {
    case "inbox":
      return [GmailLabel.INBOX];
    case "sent":
      return [GmailLabel.SENT];
    case "draft":
      return [GmailLabel.DRAFT];
    case "trash":
      return [GmailLabel.TRASH];
    case "spam":
      return [GmailLabel.SPAM];
    case "starred":
      return [GmailLabel.STARRED];
    case "important":
      return [GmailLabel.IMPORTANT];
    case "unread":
      return [GmailLabel.UNREAD];
    case "archive":
      return undefined;
    case "all":
      return undefined;
    default:
      if (!type || type === "undefined" || type === "null")
        return [GmailLabel.INBOX];
      return [type];
  }
}
