"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { TypographyH3, TypographyP } from "@/components/Typography";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CompletedPage() {
  return (
    <div>
      <Card className="my-4 max-w-2xl p-6 sm:mx-4 md:mx-auto">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>

          <TypographyH3>You're all set!</TypographyH3>

          <div className="mt-6 space-y-4">
            <TypographyP>
              We've configured your inbox with smart defaults to help you stay
              organized. Your emails will be automatically categorized.
            </TypographyP>

            <TypographyP>
              Want to customize further? You can create custom rules, and
              fine-tune your preferences anytime.
            </TypographyP>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <Button size="lg" asChild>
              <Link href="/automation">Go to AI Assistant</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
