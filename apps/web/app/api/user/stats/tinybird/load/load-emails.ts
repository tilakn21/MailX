import type { gmail_v1 } from "@googleapis/gmail";
import type { LoadTinybirdEmailsBody } from "@/app/api/user/stats/tinybird/load/validation";
import { getMessages, getMessagesBatch } from "@/utils/gmail/message";
import { isDefined } from "@/utils/types";
import { extractDomainFromEmail, extractEmailAddress } from "@/utils/email";
import { findUnsubscribeLink } from "@/utils/parse/parseHtml.server";
import { GmailLabel } from "@/utils/gmail/label";
import { createScopedLogger } from "@/utils/logger";
import { internalDateToDate } from "@/utils/date";
import prisma from "@/utils/prisma";

const PAGE_SIZE = 20; // avoid setting too high because it will hit the rate limit
// const PAUSE_AFTER_RATE_LIMIT = 10_000;
const MAX_PAGES = 50;

const logger = createScopedLogger("Load Emails");

export async function loadEmails(
  {
    userId,
    gmail,
    accessToken,
  }: {
    userId: string;
    gmail: gmail_v1.Gmail;
    accessToken: string;
  },
  body: LoadTinybirdEmailsBody,
) {
  let nextPageToken: string | undefined = undefined;
  let pages = 0;

  const newestEmailSaved = await prisma.emailMessage.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
  });

  const after = newestEmailSaved?.date;
  logger.info("Loading emails after", { after });

  while (pages < MAX_PAGES) {
    logger.info("After Page", { pages });
    const res = await saveBatch({
      userId,
      gmail,
      accessToken,
      nextPageToken,
      after,
      before: undefined,
    });

    nextPageToken = res.data.nextPageToken ?? undefined;

    if (!res.data.messages || res.data.messages.length < PAGE_SIZE) break;
    pages++;
  }

  logger.info("Completed emails after", { after });

  if (!body.loadBefore || !newestEmailSaved) return { pages };

  const oldestEmailSaved = await prisma.emailMessage.findFirst({
    where: { userId },
    orderBy: { date: "asc" },
  });

  const before = oldestEmailSaved?.date;
  logger.info("Loading emails before", { before });

  // shouldn't happen, but prevents TS errors
  if (!before) return { pages };

  while (pages < MAX_PAGES) {
    logger.info("Before Page", { pages });
    const res = await saveBatch({
      userId,
      gmail,
      accessToken,
      nextPageToken,
      before,
      after: undefined,
    });

    nextPageToken = res.data.nextPageToken ?? undefined;

    if (!res.data.messages || res.data.messages.length < PAGE_SIZE) break;
    pages++;
  }

  logger.info("Completed emails before", { before });

  return { pages };
}

async function saveBatch({
  userId,
  gmail,
  accessToken,
  nextPageToken,
  before,
  after,
}: {
  userId: string;
  gmail: gmail_v1.Gmail;
  accessToken: string;
  nextPageToken?: string;
} & (
  | { before: Date; after: undefined }
  | { before: undefined; after: Date }
  | { before: undefined; after: undefined }
)) {
  // 1. find all emails since the last time we ran this function
  let query: string | undefined;

  if (before) {
    query = `before:${+before / 1000 + 1}`;
  } else if (after) {
    query = `after:${+after / 1000 - 1}`;
  }

  const res = await getMessages(gmail, {
    query,
    maxResults: PAGE_SIZE,
    pageToken: nextPageToken,
  });

  // 2. fetch each email and save it to postgres
  const messages = await getMessagesBatch(
    res.messages?.map((m) => m.id).filter(isDefined) || [],
    accessToken,
  );

  const emailsToSave = messages
    .map((m) => {
      if (!m.id || !m.threadId) return;

      const unsubscribeLink =
        findUnsubscribeLink(m.textHtml) || m.headers["list-unsubscribe"];

      const date = internalDateToDate(m.internalDate);
      if (!date) {
        logger.error("No date for email", {
          userId,
          messageId: m.id,
          date: m.internalDate,
        });
        return;
      }

      return {
        threadId: m.threadId,
        messageId: m.id,
        from: extractEmailAddress(m.headers.from),
        fromDomain: extractDomainFromEmail(m.headers.from),
        to: m.headers.to ? extractEmailAddress(m.headers.to) : "Missing",
        date,
        unsubscribeLink,
        read: !m.labelIds?.includes(GmailLabel.UNREAD),
        sent: !!m.labelIds?.includes(GmailLabel.SENT),
        draft: !!m.labelIds?.includes(GmailLabel.DRAFT),
        inbox: !!m.labelIds?.includes(GmailLabel.INBOX),
        userId,
      };
    })
    .filter(isDefined);

  logger.info("Saving", { count: emailsToSave.length });

  // Use createMany for better performance
  await prisma.emailMessage.createMany({
    data: emailsToSave,
    skipDuplicates: true, // Skip if email already exists (based on unique constraint)
  });

  return {
    data: {
      messages: res.messages,
      nextPageToken: res.nextPageToken,
    },
  };
}
