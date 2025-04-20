import { redirect } from "next/navigation";
import { isExtra } from "@/utils/extra-features";
import { auth } from "@/app/api/auth/[...nextauth]/auth";
import prisma from "@/utils/prisma";
import { env } from "@/env";

export async function checkAndRedirectForUpgrade() {
  if (!env.NEXT_PUBLIC_WELCOME_UPGRADE_ENABLED) return;

  const session = await auth();

  const email = session?.user.email;

  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      extra: { select: { lemonSqueezyRenewsAt: true } },
      completedAppOnboardingAt: true,
    },
  });

  if (!user) redirect("/login");

  if (!isExtra(user.extra?.lemonSqueezyRenewsAt || null)) {
    if (!user.completedAppOnboardingAt) redirect("/onboarding");
    else redirect("/welcome-upgrade");
  }
}
