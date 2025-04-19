import prisma from "@/utils/prisma";
import { ActionType, ThreadTrackerType } from "@prisma/client";
import type { gmail_v1 } from "@googleapis/gmail";
import { getAwaitingReplyLabel } from "@/utils/reply-tracker/label";
import { removeThreadLabel } from "@/utils/gmail/label";
import { createScopedLogger } from "@/utils/logger";
import type { UserEmailWithAI } from "@/utils/llms/types";
import type { ParsedMessage } from "@/utils/types";
import { internalDateToDate } from "@/utils/date";
import { getEmailForLLM } from "@/utils/get-email-from-message";
import { aiChooseRule } from "@/utils/ai/choose-rule/ai-choose-rule";

/**
 * Marks an email thread as needing a reply.
 * This function coordinates the process of:
 * 1. Updating thread trackers in the database
 * 2. Managing Gmail labels
 */
export async function coordinateReplyProcess(
  userId: string,
  email: string,
  threadId: string,
  messageId: string,
  sentAt: Date,
  gmail: gmail_v1.Gmail,
) {
  const logger = createScopedLogger("reply-tracker/inbound").with({
    userId,
    email,
    threadId,
    messageId,
  });

  logger.info("Marking thread as needs reply");

  const awaitingReplyLabelId = await getAwaitingReplyLabel(gmail);

  // Process in parallel for better performance
  const dbPromise = updateThreadTrackers(userId, threadId, messageId, sentAt);
  const labelsPromise = removeThreadLabel(
    gmail,
    threadId,
    awaitingReplyLabelId,
  );

  const [dbResult, labelsResult] = await Promise.allSettled([
    dbPromise,
    labelsPromise,
  ]);

  if (dbResult.status === "rejected") {
    logger.error("Failed to mark needs reply", { error: dbResult.reason });
  }

  if (labelsResult.status === "rejected") {
    logger.error("Failed to update Gmail labels", {
      error: labelsResult.reason,
    });
  }
}

/**
 * Updates thread trackers in the database - resolves AWAITING trackers and creates a NEEDS_REPLY tracker
 */
async function updateThreadTrackers(
  userId: string,
  threadId: string,
  messageId: string,
  sentAt: Date,
) {
  return prisma.$transaction([
    // Resolve existing AWAITING trackers
    prisma.threadTracker.updateMany({
      where: {
        userId,
        threadId,
        type: ThreadTrackerType.AWAITING,
      },
      data: {
        resolved: true,
      },
    }),
    // Create new NEEDS_REPLY tracker
    prisma.threadTracker.upsert({
      where: {
        userId_threadId_messageId: {
          userId,
          threadId,
          messageId,
        },
      },
      update: {},
      create: {
        userId,
        threadId,
        messageId,
        type: ThreadTrackerType.NEEDS_REPLY,
        sentAt,
      },
    }),
  ]);
}

// Currently this is used when enabling reply tracking. Otherwise we use regular AI rule processing to handle inbound replies
export async function handleInboundReply(
  user: UserEmailWithAI,
  message: ParsedMessage,
  gmail: gmail_v1.Gmail,
) {
  // 1. Run rules check
  // 2. If the reply tracking rule is selected then mark as needs reply
  // We ignore the rest of the actions for this rule here as this could lead to double handling of emails for the user

  const replyTrackingRules = await prisma.rule.findMany({
    where: {
      userId: user.id,
      instructions: { not: null },
      actions: {
        some: {
          type: ActionType.TRACK_THREAD,
        },
      },
    },
  });

  if (replyTrackingRules.length === 0) return;

  const result = await aiChooseRule({
    email: getEmailForLLM(message),
    rules: replyTrackingRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      instructions: rule.instructions || "",
    })),
    user,
  });

  if (replyTrackingRules.some((rule) => rule.id === result.rule?.id)) {
    await coordinateReplyProcess(
      user.id,
      user.email,
      message.threadId,
      message.id,
      internalDateToDate(message.internalDate),
      gmail,
    );
  }
}
