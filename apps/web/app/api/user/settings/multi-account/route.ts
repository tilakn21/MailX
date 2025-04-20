import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import prisma from "@/utils/prisma";
import { withError } from "@/utils/middleware";

export type MultiAccountEmailsResponse = Awaited<
  ReturnType<typeof getMultiAccountEmails>
>;

async function getMultiAccountEmails(options: { email: string }) {
  const user = await prisma.user.findUnique({
    where: { email: options.email },
    select: {
      extra: {
        select: {
          users: { select: { email: true } },
          admins: { select: { id: true } },
        },
      },
    },
  });

  return {
    users: user?.extra?.users || [],
    admins: user?.extra?.admins || [],
  };
}

export const GET = withError(async () => {
  const session = await auth();
  if (!session?.user.email)
    return NextResponse.json({ error: "Not authenticated" });

  const result = await getMultiAccountEmails({ email: session.user.email });

  return NextResponse.json(result);
});
