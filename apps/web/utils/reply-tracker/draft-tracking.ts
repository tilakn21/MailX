import type { gmail_v1 } from "@googleapis/gmail";
import { ActionType, type User } from "@prisma/client";
import type { ParsedMessage } from "@/utils/types";
import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";
import { calculateSimilarity } from "@/utils/similarity-score";
import { getDraft, deleteDraft } from "@/utils/gmail/draft";
import { formatError } from "@/utils/error";

const logger = createScopedLogger("draft-tracking");

/**
 * Checks if a sent message originated from an AI draft and logs its similarity.
 */
export async function trackSentDraftStatus({
  user,
  message,
  gmail,
}: {
  user: Pick<User, "id" | "email">;
  message: ParsedMessage;
  gmail: gmail_v1.Gmail;
}) {
  const { id: userId, email: userEmail } = user;
  const { threadId, id: sentMessageId, textPlain: sentTextPlain } = message;

  const loggerOptions = { userId, userEmail, threadId, sentMessageId };

  logger.info(
    "Checking if sent message corresponds to an AI draft",
    loggerOptions,
  );

  if (!sentMessageId) {
    logger.warn("Sent message missing ID, cannot track draft status", {
      userId,
      threadId,
    });
    return;
  }

  // Find the most recently created draft for this thread
  const executedAction = await prisma.executedAction.findFirst({
    where: {
      executedRule: {
        userId: userId,
        threadId: threadId,
      },
      type: ActionType.DRAFT_EMAIL,
      draftId: { not: null },
      draftSendLog: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      content: true,
      draftId: true,
    },
  });

  if (!executedAction?.draftId) {
    logger.info(
      "No corresponding AI draft action with draftId found",
      loggerOptions,
    );
    return;
  }

  const draftExists = await getDraft(executedAction.draftId, gmail);

  if (draftExists) {
    logger.info("Original AI draft still exists, sent message was different.", {
      ...loggerOptions,
      executedActionId: executedAction.id,
      draftId: executedAction.draftId,
    });
    // Mark the action to indicate its draft was not sent
    await prisma.executedAction.update({
      where: { id: executedAction.id },
      data: { wasDraftSent: false },
    });
    return;
  }

  logger.info(
    "Original AI draft not found (likely sent or deleted), proceeding to log similarity.",
    {
      ...loggerOptions,
      executedActionId: executedAction.id,
      draftId: executedAction.draftId,
    },
  );

  const executedActionId = executedAction.id;
  const loggerOptionsWithAction = { ...loggerOptions, executedActionId };

  const similarityScore = calculateSimilarity(
    executedAction.content,
    sentTextPlain,
  );

  logger.info("Calculated similarity score", {
    ...loggerOptionsWithAction,
    similarityScore,
  });

  await prisma.$transaction([
    prisma.draftSendLog.create({
      data: {
        executedActionId: executedActionId,
        sentMessageId: sentMessageId,
        similarityScore: similarityScore,
      },
    }),
    // Mark that the draft was sent
    prisma.executedAction.update({
      where: { id: executedActionId },
      data: { wasDraftSent: true },
    }),
  ]);

  logger.info(
    "Successfully created draft send log and updated action status via transaction",
    loggerOptionsWithAction,
  );
}

/**
 * Cleans up old, unmodified AI-generated drafts in a thread.
 * Finds drafts created by executed actions that haven't been logged as sent,
 * checks if they still exist and are unmodified, and deletes them.
 */
export async function cleanupThreadAIDrafts({
  threadId,
  userId,
  gmail,
}: {
  threadId: string;
  userId: string;
  gmail: gmail_v1.Gmail;
}) {
  const loggerOptions = { userId, threadId };
  logger.info("Starting cleanup of old AI drafts for thread", loggerOptions);

  try {
    // Find all draft actions for this thread that haven't resulted in a sent log
    const potentialDraftsToClean = await prisma.executedAction.findMany({
      where: {
        executedRule: {
          userId: userId,
          threadId: threadId,
        },
        type: ActionType.DRAFT_EMAIL,
        draftId: { not: null },
        draftSendLog: null, // Only consider drafts not logged as sent
      },
      select: {
        id: true,
        draftId: true,
        content: true,
      },
    });

    if (potentialDraftsToClean.length === 0) {
      logger.info("No relevant old AI drafts found to cleanup", loggerOptions);
      return;
    }

    logger.info(
      `Found ${potentialDraftsToClean.length} potential AI drafts to check for cleanup`,
      loggerOptions,
    );

    for (const action of potentialDraftsToClean) {
      if (!action.draftId) continue; // Not expected to happen, but to fix TS error

      const actionLoggerOptions = {
        ...loggerOptions,
        executedActionId: action.id,
        draftId: action.draftId,
      };
      try {
        const draftDetails = await getDraft(action.draftId, gmail);

        if (draftDetails?.textPlain) {
          // Draft exists, check if modified
          // Using calculateSimilarity == 1.0 as the check for "unmodified"
          const similarityScore = calculateSimilarity(
            action.content,
            draftDetails.textPlain,
          );
          const isUnmodified = similarityScore === 1.0;

          logger.info("Checked existing draft for modification", {
            ...actionLoggerOptions,
            similarityScore,
            isUnmodified,
          });

          if (isUnmodified) {
            logger.info(
              "Draft is unmodified, deleting...",
              actionLoggerOptions,
            );
            await Promise.all([
              deleteDraft(gmail, action.draftId),
              // Mark as not sent (cleaned up because ignored/superseded)
              prisma.executedAction.update({
                where: { id: action.id },
                data: { wasDraftSent: false },
              }),
            ]);
            logger.info(
              "Deleted unmodified draft and updated action status.",
              actionLoggerOptions,
            );
          } else {
            logger.info(
              "Draft was modified, skipping cleanup.",
              actionLoggerOptions,
            );
            // If it was modified but not sent, mark it as ignored? Or leave wasDraftSent null?
            // Let's mark it false, as it wasn't sent as-is and won't be tracked further.
            await prisma.executedAction.update({
              where: { id: action.id },
              data: { wasDraftSent: false },
            });
          }
        } else {
          // Draft doesn't exist (returned null or no textPlain)
          logger.info(
            "Draft not found or has no content, likely already deleted/sent. Skipping cleanup.",
            actionLoggerOptions,
          );
          // If it wasn't logged via draftSendLog but doesn't exist,
          // maybe it was manually deleted? Mark wasDraftSent as false.
          await prisma.executedAction.update({
            where: { id: action.id },
            data: { wasDraftSent: false },
          });
        }
      } catch (error) {
        logger.error("Error processing individual draft during cleanup", {
          ...actionLoggerOptions,
          error: formatError(error),
        });
      }
    }
    logger.info("Finished cleanup check for old AI drafts", loggerOptions);
  } catch (error) {
    logger.error("Error querying potential drafts for cleanup", {
      ...loggerOptions,
      error,
    });
  }
}
