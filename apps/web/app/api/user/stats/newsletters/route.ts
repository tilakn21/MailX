import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import { withError } from "@/utils/middleware";
import {
  filterNewsletters,
  findAutoArchiveFilter,
  findNewsletterStatus,
  getAutoArchiveFilters,
} from "@/app/api/user/stats/newsletters/helpers";
import prisma from "@/utils/prisma";
import { Prisma } from "@prisma/client";
import { extractEmailAddress } from "@/utils/email";

// not sure why this is slow sometimes
export const maxDuration = 30;

const newsletterStatsQuery = z.object({
  limit: z.coerce.number().nullish(),
  fromDate: z.coerce.number().nullish(),
  toDate: z.coerce.number().nullish(),
  orderBy: z.enum(["emails", "unread", "unarchived"]).optional(),
  types: z
    .array(z.enum(["read", "unread", "archived", "unarchived", ""]))
    .transform((arr) => arr?.filter(Boolean)),
  filters: z
    .array(
      z.enum(["unhandled", "autoArchived", "unsubscribed", "approved", ""]),
    )
    .optional()
    .transform((arr) => arr?.filter(Boolean)),
  includeMissingUnsubscribe: z.boolean().optional(),
});
export type NewsletterStatsQuery = z.infer<typeof newsletterStatsQuery>;
export type NewsletterStatsResponse = Awaited<
  ReturnType<typeof getNewslettersTinybird>
>;

function getTypeFilters(types: NewsletterStatsQuery["types"]) {
  const typeMap = Object.fromEntries(types.map((type) => [type, true]));

  // only use the read flag if unread is unmarked
  // if read and unread are both set or both unset, we don't need to filter by read/unread at all
  const read = Boolean(typeMap.read && !typeMap.unread);
  const unread = Boolean(!typeMap.read && typeMap.unread);

  // similar logic to read/unread
  const archived = Boolean(typeMap.archived && !typeMap.unarchived);
  const unarchived = Boolean(!typeMap.archived && typeMap.unarchived);

  // we only need AND if both read/unread and archived/unarchived are set
  const andClause = (read || unread) && (archived || unarchived);

  const all =
    !types.length ||
    types.length === 4 ||
    (!read && !unread && !archived && !unarchived);

  return {
    all,
    read,
    unread,
    archived,
    unarchived,
    andClause,
  };
}

async function getNewslettersTinybird(
  options: { ownerEmail: string; userId: string } & NewsletterStatsQuery,
) {
  const types = getTypeFilters(options.types);

  const [newsletterCounts, autoArchiveFilters, userNewsletters] =
    await Promise.all([
      getNewsletterCounts({
        ...options,
        ...types,
      }),
      getAutoArchiveFilters(),
      findNewsletterStatus(options.userId),
    ]);

  const newsletters = newsletterCounts.map((email: NewsletterCountResult) => {
    const from = extractEmailAddress(email.from);
    return {
      name: from,
      value: email.count,
      inboxEmails: email.inboxEmails,
      readEmails: email.readEmails,
      lastUnsubscribeLink: email.lastUnsubscribeLink,
      autoArchived: findAutoArchiveFilter(autoArchiveFilters, from),
      status: userNewsletters?.find((n) => n.email === from)?.status,
    };
  });

  if (!options.filters?.length) return { newsletters };

  return {
    newsletters: filterNewsletters(newsletters, options.filters),
  };
}

type NewsletterCountResult = {
  from: string;
  count: number;
  inboxEmails: number;
  readEmails: number;
  lastUnsubscribeLink: string | null;
};

type NewsletterCountRawResult = {
  from: string;
  count: bigint;
  inboxEmails: bigint;
  readEmails: bigint;
  lastUnsubscribeLink: string | null;
};

async function getNewsletterCounts(
  options: NewsletterStatsQuery & {
    userId: string;
    read?: boolean;
    unread?: boolean;
    archived?: boolean;
    unarchived?: boolean;
    all?: boolean;
    andClause?: boolean;
  },
): Promise<NewsletterCountResult[]> {
  // Collect SQL query conditions
  const whereConditions: string[] = [];
  const queryParams: Array<string | Date> = [];

  // Add date filters if provided
  if (options.fromDate) {
    whereConditions.push(
      `"date" >= to_timestamp($${queryParams.length + 1}::double precision)`,
    );
    queryParams.push((options.fromDate / 1000).toString()); // Convert milliseconds to seconds
  }

  if (options.toDate) {
    whereConditions.push(
      `"date" <= to_timestamp($${queryParams.length + 1}::double precision)`,
    );
    queryParams.push((options.toDate / 1000).toString()); // Convert milliseconds to seconds
  }

  // Add read/unread filters
  if (options.read) {
    whereConditions.push("read = true");
  } else if (options.unread) {
    whereConditions.push("read = false");
  }

  // Add inbox/archived filters
  if (options.unarchived) {
    whereConditions.push("inbox = true");
  } else if (options.archived) {
    whereConditions.push("inbox = false");
  }

  // Always filter by userId
  whereConditions.push(`"userId" = $${queryParams.length + 1}`);
  queryParams.push(options.userId);

  // Create WHERE clause
  const whereClause = whereConditions.length
    ? `WHERE ${whereConditions.join(" AND ")}`
    : "";

  // Build order by clause
  const orderByClause = options.orderBy
    ? getOrderByClause(options.orderBy)
    : '"count" DESC';

  // Build limit clause
  const limitClause = options.limit ? `LIMIT ${options.limit}` : "";

  // Wrap in a subquery so we can use aliases in ORDER BY
  const query = Prisma.sql`
    WITH newsletter_stats AS (
      SELECT 
        "from",
        COUNT(*) as "count",
        SUM(CASE WHEN inbox = true THEN 1 ELSE 0 END) as "inboxEmails",
        SUM(CASE WHEN read = true THEN 1 ELSE 0 END) as "readEmails",
        MAX("unsubscribeLink") as "lastUnsubscribeLink"
      FROM "EmailMessage"
      ${Prisma.raw(whereClause)}
      GROUP BY "from"
    )
    SELECT * FROM newsletter_stats
    ORDER BY ${Prisma.raw(orderByClause)}
    ${Prisma.raw(limitClause)}
  `;

  try {
    const results = await prisma.$queryRawUnsafe<NewsletterCountRawResult[]>(
      query.sql,
      ...queryParams,
      ...query.values,
    );

    // Convert BigInt values to regular numbers
    return results.map((result) => ({
      from: result.from,
      count: Number(result.count),
      inboxEmails: Number(result.inboxEmails),
      readEmails: Number(result.readEmails),
      lastUnsubscribeLink: result.lastUnsubscribeLink,
    }));
  } catch (error) {
    console.error("Newsletter query error:", error);
    return [];
  }
}

function getOrderByClause(orderBy: string): string {
  switch (orderBy) {
    case "emails":
      return '"count" DESC';
    case "unread":
      return '"count" - "readEmails" DESC';
    case "unarchived":
      return '"inboxEmails" DESC';
    default:
      return '"count" DESC';
  }
}

export const GET = withError(async (request) => {
  const session = await auth();
  if (!session?.user.email)
    return NextResponse.json({ error: "Not authenticated" });

  const { searchParams } = new URL(request.url);
  const params = newsletterStatsQuery.parse({
    limit: searchParams.get("limit"),
    fromDate: searchParams.get("fromDate"),
    toDate: searchParams.get("toDate"),
    orderBy: searchParams.get("orderBy"),
    types: searchParams.get("types")?.split(",") || [],
    filters: searchParams.get("filters")?.split(",") || [],
    includeMissingUnsubscribe:
      searchParams.get("includeMissingUnsubscribe") === "true",
  });

  const result = await getNewslettersTinybird({
    ...params,
    ownerEmail: session.user.email,
    userId: session.user.id,
  });

  return NextResponse.json(result);
});
