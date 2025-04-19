import { Suspense } from "react";
import type { Metadata } from "next";
import { Hero } from "@/app/(landing)/home/Hero";
import { CTA } from "@/app/(landing)/home/CTA";
import { BasicLayout } from "@/components/layouts/BasicLayout";

export const metadata: Metadata = {
  title: "Focused reply| Track what needs a reply with AI",
  description:
    "Reply Zero uses AI to identify the emails that need a reply, and who hasn't responded yet.",
  alternates: { canonical: "/reply-zero-ai" },
};

export default function ReplyZero() {
  return (
    <BasicLayout>
      <Hero
        title="Focused Reply: Never miss a reply"
        subtitle="Most emails don't need a reply — focused reply surfaces the ones that do. We'll track what you need to reply to, and who to follow up with."
      />
    
      <Suspense>
        <div className="pb-32">
      
        </div>
      </Suspense>
      <CTA />
    </BasicLayout>
  );
}
