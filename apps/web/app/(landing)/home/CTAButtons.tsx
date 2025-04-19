"use client";

import { Button } from "@/components/Button";
import { usePostHog } from "posthog-js/react";

export function CTAButtons() {
  const posthog = usePostHog();
  return (
    <Button
      size="xl"
      className="mt-10"
      link={{ href: "/login" }}
      onClick={() => {
        posthog.capture("Clicked Get Started");
      }}
      color="white"
    >
      Get Started with MailX
    </Button>
  );
}
