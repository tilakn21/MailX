import type { gmail_v1 } from "@googleapis/gmail";
import { after } from "next/server";
import type {
  ParsedMessage,
  RuleWithActionsAndCategories,
} from "@/utils/types";
import type { UserAIFields } from "@/utils/llms/types";
import {
  ExecutedRuleStatus,
  Prisma,
  type Rule,
  type User,
} from "@prisma/client";
import type { ActionItem } from "@/utils/ai/types";
import { findMatchingRule } from "@/utils/ai/choose-rule/match-rules";
import { getActionItemsWithAiArgs } from "@/utils/ai/choose-rule/choose-args";
import { executeAct } from "@/utils/ai/choose-rule/execute";
import prisma from "@/utils/prisma";
import { createScopedLogger } from "@/utils/logger";
import type { MatchReason } from "@/utils/ai/choose-rule/types";
import { sanitizeActionFields } from "@/utils/action-item";
import { extractEmailAddress } from "@/utils/email";
import { analyzeSenderPattern } from "@/app/api/ai/analyze-sender-pattern/call-analyze-pattern-api";

const logger = createScopedLogger("ai-run-rules");

export type RunRulesResult = {
  rule?: Rule | null;
  actionItems?: ActionItem[];
  reason?: string | null;
  matchReasons?: MatchReason[];
  existing?: boolean;
};

export async function runRules({
  gmail,
  message,
  rules,
  user,
  isTest,
}: {
  gmail: gmail_v1.Gmail;
  message: ParsedMessage;
  rules: RuleWithActionsAndCategories[];
  user: Pick<User, "id" | "email" | "about"> & UserAIFields;
  isTest: boolean;
}): Promise<RunRulesResult> {
  const result = await findMatchingRule(rules, message, user, gmail);

  analyzeSenderPatternIfAiMatch(isTest, result, message, user);

  logger.trace("Matching rule", { result });

  if (result.rule) {
    return await executeMatchedRule(
      result.rule,
      message,
      user,
      gmail,
      result.reason,
      result.matchReasons,
      isTest,
    );
  } else {
    await saveSkippedExecutedRule({
      userId: user.id,
      threadId: message.threadId,
      messageId: message.id,
      reason: result.reason,
    });
  }
  return result;
}

async function executeMatchedRule(
  rule: RuleWithActionsAndCategories,
  message: ParsedMessage,
  user: Pick<User, "id" | "email" | "about"> & UserAIFields,
  gmail: gmail_v1.Gmail,
  reason: string | undefined,
  matchReasons: MatchReason[] | undefined,
  isTest: boolean,
) {
  // get action items with args
  const actionItems = await getActionItemsWithAiArgs({
    message,
    user,
    selectedRule: rule,
    gmail,
  });

  // handle action
  const executedRule = isTest
    ? undefined
    : await saveExecutedRule(
        {
          userId: user.id,
          threadId: message.threadId,
          messageId: message.id,
        },
        {
          rule,
          actionItems,
          reason,
        },
      );

  const shouldExecute = executedRule && rule.automate;

  if (shouldExecute) {
    await executeAct({
      gmail,
      userEmail: user.email || "",
      executedRule,
      message,
    });
  }

  return {
    rule,
    actionItems,
    executedRule,
    reason,
    matchReasons,
  };
}

async function saveSkippedExecutedRule({
  userId,
  threadId,
  messageId,
  reason,
}: {
  userId: string;
  threadId: string;
  messageId: string;
  reason?: string;
}) {
  const data: Prisma.ExecutedRuleCreateInput = {
    threadId,
    messageId,
    automated: true,
    reason,
    status: ExecutedRuleStatus.SKIPPED,
    user: { connect: { id: userId } },
  };

  await upsertExecutedRule({
    userId,
    threadId,
    messageId,
    data,
  });
}

async function saveExecutedRule(
  {
    userId,
    threadId,
    messageId,
  }: {
    userId: string;
    threadId: string;
    messageId: string;
  },
  {
    rule,
    actionItems,
    reason,
  }: {
    rule: RuleWithActionsAndCategories;
    actionItems: ActionItem[];
    reason?: string;
  },
) {
  const data: Prisma.ExecutedRuleCreateInput = {
    actionItems: {
      createMany: {
        data: actionItems?.map(sanitizeActionFields) || [],
      },
    },
    messageId,
    threadId,
    automated: !!rule?.automate,
    status: ExecutedRuleStatus.PENDING,
    reason,
    rule: rule?.id ? { connect: { id: rule.id } } : undefined,
    user: { connect: { id: userId } },
  };

  return await upsertExecutedRule({ userId, threadId, messageId, data });
}

async function upsertExecutedRule({
  userId,
  threadId,
  messageId,
  data,
}: {
  userId: string;
  threadId: string;
  messageId: string;
  data: Prisma.ExecutedRuleCreateInput;
}) {
  try {
    return await prisma.executedRule.upsert({
      where: {
        unique_user_thread_message: {
          userId,
          threadId,
          messageId,
        },
      },
      create: data,
      update: data,
      include: { actionItems: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation, ignore the error
      // May be due to a race condition?
      logger.info("Ignored duplicate entry for ExecutedRule", {
        userId,
        threadId,
        messageId,
      });
      return await prisma.executedRule.findUnique({
        where: {
          unique_user_thread_message: {
            userId,
            threadId,
            messageId,
          },
        },
        include: { actionItems: true },
      });
    }
    // Re-throw any other errors
    throw error;
  }
}

async function analyzeSenderPatternIfAiMatch(
  isTest: boolean,
  result: { rule?: Rule | null; matchReasons?: MatchReason[] },
  message: ParsedMessage,
  user: Pick<User, "id">,
) {
  if (
    !isTest &&
    result.rule &&
    // skip if we already matched for static reasons
    // learnings only needed for rules that would run through an ai
    !result.matchReasons?.some(
      (reason) =>
        reason.type === "STATIC" ||
        reason.type === "GROUP" ||
        reason.type === "CATEGORY",
    )
  ) {
    const fromAddress = extractEmailAddress(message.headers.from);
    if (fromAddress) {
      after(() =>
        analyzeSenderPattern({
          userId: user.id,
          from: fromAddress,
        }),
      );
    }
  }
}
