"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bulkCategorizeSendersAction } from "@/utils/actions/categorize";
import { handleActionCall } from "@/utils/server-action";
import { isActionError } from "@/utils/error";
import { ExtraTooltip, useExtra } from "@/components/ExtraAlert";
import { useExtraModal } from "@/components/ExtraModal";
import type { ButtonProps } from "@/components/ui/button";
import { useCategorizeProgress } from "@/app/(app)/smart-categories/CategorizeProgress";
import { Tooltip } from "@/components/Tooltip";

export function CategorizeWithAiButton({
  buttonProps,
}: {
  buttonProps?: ButtonProps;
}) {
  const [isCategorizing, setIsCategorizing] = useState(false);
  const { hasAiAccess } = useExtra();
  const { ExtraModal, openModal: openExtraModal } = useExtraModal();

  const { setIsBulkCategorizing } = useCategorizeProgress();

  return (
    <>
      <CategorizeWithAiButtonTooltip
        hasAiAccess={hasAiAccess}
        openExtraModal={openExtraModal}
      >
        <Button
          type="button"
          loading={isCategorizing}
          disabled={!hasAiAccess}
          onClick={async () => {
            if (isCategorizing) return;
            toast.promise(
              async () => {
                setIsCategorizing(true);
                setIsBulkCategorizing(true);
                const result = await handleActionCall(
                  "bulkCategorizeSendersAction",
                  bulkCategorizeSendersAction,
                );

                if (isActionError(result)) {
                  setIsCategorizing(false);
                  throw new Error(result.error);
                }

                setIsCategorizing(false);

                return result;
              },
              {
                loading: "Categorizing senders... This might take a while.",
                success: ({ totalUncategorizedSenders }) => {
                  return totalUncategorizedSenders
                    ? `Categorizing ${totalUncategorizedSenders} senders...`
                    : "There are no more senders to categorize.";
                },
                error: (err) => {
                  return `Error categorizing senders: ${err.message}`;
                },
              },
            );
          }}
          {...buttonProps}
        >
          {buttonProps?.children || (
            <>
              <SparklesIcon className="mr-2 size-4" />
              Categorize Senders with AI
            </>
          )}
        </Button>
      </CategorizeWithAiButtonTooltip>
      <ExtraModal />
    </>
  );
}

function CategorizeWithAiButtonTooltip({
  children,
  hasAiAccess,
  openExtraModal,
}: {
  children: React.ReactElement<any>;
  hasAiAccess: boolean;
  openExtraModal: () => void;
}) {
  if (hasAiAccess) {
    return (
      <Tooltip content="Categorize thousands of senders. This will take a few minutes.">
        {children}
      </Tooltip>
    );
  }

  return (
    <ExtraTooltip showTooltip={!hasAiAccess} openModal={openExtraModal}>
      {children}
    </ExtraTooltip>
  );
}
