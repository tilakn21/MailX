"use client";

import { BotIcon, CoinsIcon, CpuIcon } from "lucide-react";
import { formatStat } from "@/utils/stats";
import { StatsCards } from "@/components/StatsCards";
import { useExtra } from "@/components/ExtraAlert";
import { LoadingContent } from "@/components/LoadingContent";
import { env } from "@/env";
import { isExtra } from "@/utils/extra-features";

export function Usage(props: {
  usage?: {
    openaiCalls: number;
    openaiTokensUsed: number;
  } | null;
}) {
  const { data, isLoading, error } = useExtra();

  return (
    <LoadingContent loading={isLoading} error={error}>
      <StatsCards
        stats={[
          {
            name: "Unsubscribe Credits",
            value: isExtra(data?.extra?.lemonSqueezyRenewsAt || null)
              ? "Unlimited"
              : formatStat(
                  data?.extra?.unsubscribeCredits ??
                    env.NEXT_PUBLIC_FREE_UNSUBSCRIBE_CREDITS,
                ),
            subvalue: "credits",
            icon: <CoinsIcon className="h-4 w-4" />,
          },
          {
            name: "LLM API Calls",
            value: formatStat(props.usage?.openaiCalls),
            subvalue: "calls",
            icon: <BotIcon className="h-4 w-4" />,
          },
          {
            name: "LLM Tokens Used",
            value: formatStat(props.usage?.openaiTokensUsed),
            subvalue: "tokens",
            icon: <CpuIcon className="h-4 w-4" />,
          },
        ]}
      />
    </LoadingContent>
  );
}
