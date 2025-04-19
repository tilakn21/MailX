import { useMemo } from "react";
import { atom, useAtomValue } from "jotai";
import pRetry from "p-retry";
import { jotaiStore } from "@/store";
import { exponentialBackoff } from "@/utils/sleep";
import { sleep } from "@/utils/sleep";
import { isActionError } from "@/utils/error";
import { categorizeSenderAction } from "@/utils/actions/categorize";
import { aiQueue } from "@/utils/queue/ai-queue";

type CategorizationStatus = "pending" | "processing" | "completed";

interface QueueItem {
  status: CategorizationStatus;
  categoryId?: string;
}

const aiCategorizeSenderQueueAtom = atom<Map<string, QueueItem>>(new Map());

export const pushToAiCategorizeSenderQueueAtom = (pushIds: string[]) => {
  jotaiStore.set(aiCategorizeSenderQueueAtom, (prev) => {
    const newQueue = new Map(prev);
    for (const id of pushIds) {
      if (!newQueue.has(id)) {
        newQueue.set(id, { status: "pending" });
      }
    }
    return newQueue;
  });

  processAiCategorizeSenderQueue({ senders: pushIds });
};

export const stopAiCategorizeSenderQueue = () => {
  jotaiStore.set(aiCategorizeSenderQueueAtom, new Map());
  aiQueue.clear();
};

const aiCategorizationQueueItemAtom = atom((get) => {
  const queue = get(aiCategorizeSenderQueueAtom);
  return queue;
});

export const useAiCategorizationQueueItem = (id: string) => {
  const queue = useAtomValue(aiCategorizationQueueItemAtom);
  return useMemo(() => queue.get(id), [queue, id]);
};

const hasProcessingItemsAtom = atom((get) => {
  const queue = get(aiCategorizeSenderQueueAtom);
  return Array.from(queue.values()).some(
    (item) => item.status === "processing",
  );
});

export const useHasProcessingItems = () => {
  return useAtomValue(hasProcessingItemsAtom);
};

function processAiCategorizeSenderQueue({ senders }: { senders: string[] }) {
  const tasks = senders.map((sender) => async () => {
    jotaiStore.set(aiCategorizeSenderQueueAtom, (prev) => {
      const newQueue = new Map(prev);
      newQueue.set(sender, { status: "processing" });
      return newQueue;
    });

    await pRetry(
      async (attemptCount) => {
        console.log(
          `Queue: aiCategorizeSender. Processing ${sender}${attemptCount > 1 ? ` (attempt ${attemptCount})` : ""}`,
        );

        const result = await categorizeSenderAction(sender);

        if (isActionError(result)) {
          await sleep(exponentialBackoff(attemptCount, 1_000));
          throw new Error(result.error);
        }

        jotaiStore.set(aiCategorizeSenderQueueAtom, (prev) => {
          const newQueue = new Map(prev);
          newQueue.set(sender, {
            status: "completed",
            categoryId: result.categoryId || undefined,
          });
          return newQueue;
        });
      },
      { retries: 3 },
    );
  });

  aiQueue.addAll(tasks);
}
