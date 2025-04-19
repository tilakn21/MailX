import type { gmail_v1 } from "@googleapis/gmail";
import type { ParsedMessage } from "@/utils/types";
import { internalDateToDate } from "@/utils/date";
import { getEmailForLLM } from "@/utils/get-email-from-message";
import { draftEmail } from "@/utils/gmail/mail";
import { aiDraftWithKnowledge } from "@/utils/ai/reply/draft-with-knowledge";
import { getReply, saveReply } from "@/utils/redis/reply";
import { getAiUser, getWritingStyle } from "@/utils/user/get";
import { getThreadMessages } from "@/utils/gmail/thread";
import type { UserEmailWithAI } from "@/utils/llms/types";
import { createScopedLogger } from "@/utils/logger";
import prisma from "@/utils/prisma";
import { aiExtractRelevantKnowledge } from "@/utils/ai/knowledge/extract";
import { stringifyEmail } from "@/utils/stringify-email";
import { aiExtractFromEmailHistory } from "@/utils/ai/knowledge/extract-from-email-history";
import { getMessagesBatch } from "@/utils/gmail/message";
import { getAccessTokenFromClient } from "@/utils/gmail/client";

const logger = createScopedLogger("generate-reply");

export async function generateDraft({
  userId,
  userEmail,
  gmail,
  message,
}: {
  userId: string;
  userEmail: string;
  gmail: gmail_v1.Gmail;
  message: ParsedMessage;
}) {
  const logger = createScopedLogger("generate-reply").with({
    email: userEmail,
    userId,
    messageId: message.id,
    threadId: message.threadId,
  });

  logger.info("Generating draft");

  const user = await getAiUser({ id: userId });
  if (!user) throw new Error("User not found");

  // 1. Draft with AI
  const result = await fetchMessagesAndGenerateDraft(
    user,
    message.threadId,
    gmail,
  );

  logger.info("Draft generated", { result });

  if (typeof result !== "string") {
    throw new Error("Draft result is not a string");
  }

  // 2. Create Gmail draft
  await draftEmail(gmail, message, { content: result });

  logger.info("Draft created");
}

/**
 * Fetches thread messages and generates draft content in one step
 */
export async function fetchMessagesAndGenerateDraft(
  user: UserEmailWithAI,
  threadId: string,
  gmail: gmail_v1.Gmail,
): Promise<string> {
  const { threadMessages, previousConversationMessages } =
    await fetchThreadAndConversationMessages(threadId, gmail);

  const result = await generateDraftContent(
    user,
    threadMessages,
    previousConversationMessages,
  );

  if (typeof result !== "string") {
    throw new Error("Draft result is not a string");
  }

  return result;
}

/**
 * Fetches thread messages and previous conversation messages
 */
async function fetchThreadAndConversationMessages(
  threadId: string,
  gmail: gmail_v1.Gmail,
): Promise<{
  threadMessages: ParsedMessage[];
  previousConversationMessages: ParsedMessage[] | null;
}> {
  // current thread messages
  const threadMessages = await getThreadMessages(threadId, gmail);

  // previous conversation messages
  const previousConversationMessages = await getMessagesBatch(
    threadMessages.map((msg) => msg.id),
    getAccessTokenFromClient(gmail),
  );

  return {
    threadMessages,
    previousConversationMessages,
  };
}

async function generateDraftContent(
  user: UserEmailWithAI,
  threadMessages: ParsedMessage[],
  previousConversationMessages: ParsedMessage[] | null,
) {
  const lastMessage = threadMessages.at(-1);

  if (!lastMessage) throw new Error("No message provided");

  const reply = await getReply({ userId: user.id, messageId: lastMessage.id });

  if (reply) return reply;

  const messages = threadMessages.map((msg, index) => ({
    to: msg.headers.to,
    date: internalDateToDate(msg.internalDate),
    ...getEmailForLLM(msg, {
      // give more context for the message we're processing
      maxLength: index === threadMessages.length - 1 ? 2000 : 500,
      extractReply: true,
      removeForwarded: false,
    }),
  }));

  // 1. Get knowledge base entries
  const knowledgeBase = await prisma.knowledge.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  // If we have knowledge base entries, extract relevant knowledge and draft with it
  // 2a. Extract relevant knowledge
  const lastMessageContent = stringifyEmail(
    messages[messages.length - 1],
    10000,
  );
  const knowledgeResult = await aiExtractRelevantKnowledge({
    knowledgeBase,
    emailContent: lastMessageContent,
    user,
  });

  // 2b. Extract email history context
  const senderEmail = lastMessage.headers.from;

  logger.info("Fetching historical messages from sender", {
    sender: senderEmail,
  });

  // Convert to format needed for aiExtractFromEmailHistory
  const historicalMessagesForLLM = previousConversationMessages?.map((msg) => {
    return getEmailForLLM(msg, {
      maxLength: 1000,
      extractReply: true,
      removeForwarded: false,
    });
  });

  const emailHistorySummary = historicalMessagesForLLM?.length
    ? await aiExtractFromEmailHistory({
        currentThreadMessages: messages,
        historicalMessages: historicalMessagesForLLM,
        user,
      })
    : null;

  const writingStyle = await getWritingStyle(user.email);

  // 3. Draft with extracted knowledge
  const text = await aiDraftWithKnowledge({
    messages,
    user,
    knowledgeBaseContent: knowledgeResult?.relevantContent || null,
    emailHistorySummary,
    writingStyle,
  });

  if (typeof text === "string") {
    await saveReply({
      userId: user.id,
      messageId: lastMessage.id,
      reply: text,
    });
  }

  return text;
}
