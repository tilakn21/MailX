"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { completedAppOnboardingAction } from "@/utils/actions/user";
import { env } from "@/env";
import { useExtra } from "@/components/ExtraAlert";

export const OnboardingFinish = () => {
  const { isExtra } = useExtra();

  function getHref() {
    if (isExtra) return env.NEXT_PUBLIC_APP_HOME_PATH;
    return env.NEXT_PUBLIC_WELCOME_UPGRADE_ENABLED
      ? "/welcome-upgrade"
      : env.NEXT_PUBLIC_APP_HOME_PATH;
  }

  return (
    <Button asChild>
      <Link onClick={() => completedAppOnboardingAction()} href={getHref()}>
        Continue
      </Link>
    </Button>
  );
};
