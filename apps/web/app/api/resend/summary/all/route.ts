import { NextResponse } from "next/server";
import subDays from "date-fns/subDays";
import prisma from "@/utils/prisma";
import { withError } from "@/utils/middleware";
import { env } from "@/env";
import {
  getCronSecretHeader,
  hasCronSecret,
  hasPostCronSecret,
} from "@/utils/cron";
import { Frequency } from "@prisma/client";
import { captureException } from "@/utils/error";
import { createScopedLogger } from "@/utils/logger";
import { publishToQstashQueue } from "@/utils/upstash";

const logger = createScopedLogger("cron/resend/summary/all");

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function sendSummaryAllUpdate() {
  logger.info("Sending summary all update");

  const users = await prisma.user.findMany({
    select: { email: true },
    where: {
      summaryEmailFrequency: {
        not: Frequency.NEVER,
      },
      // Only send to premium users
      premium: {
        lemonSqueezyRenewsAt: {
          gt: new Date(),
        },
      },
      // User at least 4 days old
      createdAt: {
        lt: subDays(new Date(), 4),
      },
    },
  });

  logger.info("Sending summary to users", { count: users.length });

  const url = `${env.NEXT_PUBLIC_BASE_URL}/api/resend/summary`;

  for (const user of users) {
    try {
      await publishToQstashQueue({
        queueName: "email-summary-all",
        parallelism: 3, // Allow up to 3 concurrent jobs from this queue
        url,
        body: { email: user.email },
        headers: getCronSecretHeader(),
      });
    } catch (error) {
      logger.error("Failed to publish to Qstash", {
        email: user.email,
        error,
      });
    }
  }

  logger.info("All requests initiated", { count: users.length });
  return { count: users.length };
}

export const GET = withError(async (request) => {
  if (!hasCronSecret(request)) {
    captureException(new Error("Unauthorized request: api/resend/summary/all"));
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await sendSummaryAllUpdate();

  return NextResponse.json(result);
});

export const POST = withError(async (request: Request) => {
  if (!(await hasPostCronSecret(request))) {
    captureException(
      new Error("Unauthorized cron request: api/resend/summary/all"),
    );
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await sendSummaryAllUpdate();

  return NextResponse.json(result);
});
