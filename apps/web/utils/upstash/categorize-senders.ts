import chunk from "lodash/chunk";
import { deleteQueue, listQueues, publishToQstashQueue } from "@/utils/upstash";
import { env } from "@/env";
import type { AiCategorizeSenders } from "@/app/api/user/categorize/senders/batch/handle-batch-validation";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("upstash");

const CATEGORIZE_SENDERS_PREFIX = "ai-categorize-senders";

const getCategorizeSendersQueueName = (userId: string) =>
  `${CATEGORIZE_SENDERS_PREFIX}-${userId}`;

/**
 * Publishes sender categorization tasks to QStash queue in batches
 * Splits large arrays of senders into chunks of BATCH_SIZE to prevent overwhelming the system
 */
export async function publishToAiCategorizeSendersQueue(
  body: AiCategorizeSenders,
) {
  const url = `${env.WEBHOOK_URL || env.NEXT_PUBLIC_BASE_URL}/api/user/categorize/senders/batch`;

  // Split senders into smaller chunks to process in batches
  const BATCH_SIZE = 50;
  const chunks = chunk(body.senders, BATCH_SIZE);

  // Create new queue for each user so we can run multiple users in parallel
  const queueName = getCategorizeSendersQueueName(body.userId);

  logger.info("Publishing to AI categorize senders queue in chunks", {
    url,
    queueName,
    totalSenders: body.senders.length,
    numberOfChunks: chunks.length,
  });

  // Process all chunks in parallel, each as a separate queue item
  await Promise.all(
    chunks.map((senderChunk) =>
      publishToQstashQueue({
        queueName,
        parallelism: 3, // Allow up to 3 concurrent jobs from this queue
        url,
        body: { userId: body.userId, senders: senderChunk },
      }),
    ),
  );
}

export async function deleteEmptyCategorizeSendersQueues({
  skipUserId,
}: {
  skipUserId: string;
}) {
  return deleteEmptyQueues(CATEGORIZE_SENDERS_PREFIX, skipUserId);
}

async function deleteEmptyQueues(prefix: string, skipUserId: string) {
  const queues = await listQueues();
  logger.info("Found queues", { count: queues.length });
  for (const queue of queues) {
    if (!queue.name.startsWith(prefix)) continue;
    if (skipUserId && queue.name === getCategorizeSendersQueueName(skipUserId))
      continue;

    if (!queue.lag) {
      try {
        await deleteQueue(queue.name);
      } catch (error) {
        logger.error("Error deleting queue", { queueName: queue.name, error });
      }
    }
  }
}
