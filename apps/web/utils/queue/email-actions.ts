"use client";

import { runRulesAction } from "@/utils/actions/ai-rule";
import { pushToAiQueueAtom, removeFromAiQueueAtom } from "@/store/ai-queue";
import type { Thread } from "@/components/email-list/types";
import { isDefined } from "@/utils/types";
import { aiQueue } from "@/utils/queue/ai-queue";

export const runAiRules = async (threadsArray: Thread[], rerun: boolean) => {
  const threads = threadsArray.filter(isDefined);
  const threadIds = threads.map((t) => t.id);
  pushToAiQueueAtom(threadIds);

  aiQueue.addAll(
    threads.map((thread) => async () => {
      const message = thread.messages?.[thread.messages.length - 1];
      if (!message) return;
      await runRulesAction({
        messageId: message.id,
        threadId: thread.id,
        rerun,
        isTest: false,
      });
      removeFromAiQueueAtom(thread.id);
    }),
  );
};
