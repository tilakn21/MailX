import { hasAiAccess } from "@/utils/extra-features";
import prisma from "@/utils/prisma";

export async function validateUserAndAiAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      aiProvider: true,
      aiModel: true,
      aiApiKey: true,
      about: true,
      extra: { select: { aiAutomationAccess: true } },
    },
  });
  if (!user) return { error: "User not found" };

  const userHasAiAccess = hasAiAccess(
    user.extra?.aiAutomationAccess,
    user.aiApiKey,
  );
  if (!userHasAiAccess) return { error: "Please upgrade for AI access" };

  return { user };
}
