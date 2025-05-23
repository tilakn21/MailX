import { usePostHog } from "posthog-js/react";
import {
  ArchiveIcon,
  BadgeCheckIcon,
  MailMinusIcon,
  TrashIcon,
} from "lucide-react";
import {
  useBulkUnsubscribe,
  useBulkApprove,
  useBulkAutoArchive,
  useBulkArchive,
  useBulkDelete,
} from "@/app/(app)/bulk-unsubscribe/hooks";
import { ExtraTooltip, useExtra } from "@/components/ExtraAlert";
import { Button } from "@/components/ui/button";
import { useExtraModal } from "@/components/ExtraModal";

export function BulkActions({
  selected,
  mutate,
}: {
  selected: Map<string, boolean>;
  mutate: () => Promise<any>;
}) {
  const posthog = usePostHog();
  const { hasUnsubscribeAccess, mutate: refetchextra } = useExtra();
  const { ExtraModal, openModal } = useExtraModal();

  const { bulkUnsubscribeLoading, onBulkUnsubscribe } = useBulkUnsubscribe({
    hasUnsubscribeAccess,
    mutate,
    posthog,
    refetchextra,
  });

  const { bulkApproveLoading, onBulkApprove } = useBulkApprove({
    mutate,
    posthog,
  });

  const { bulkAutoArchiveLoading, onBulkAutoArchive } = useBulkAutoArchive({
    hasUnsubscribeAccess,
    mutate,
    refetchextra,
  });

  const { onBulkArchive } = useBulkArchive({ mutate, posthog });

  const { onBulkDelete } = useBulkDelete({ mutate, posthog });

  const getSelectedValues = () =>
    Array.from(selected.entries())
      .filter(([, value]) => value)
      .map(([name, value]) => ({
        name,
        value,
      }));

  return (
    <>
      <ExtraTooltip showTooltip={!hasUnsubscribeAccess} openModal={openModal}>
        <div className="flex items-center space-x-1.5">
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkUnsubscribe(getSelectedValues())}
              loading={bulkUnsubscribeLoading}
            >
              <MailMinusIcon className="mr-2 size-4" />
              Unsubscribe
            </Button>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const yes = confirm(
                  "Automatically archive all current and future emails from these senders?",
                );
                if (yes) {
                  onBulkAutoArchive(getSelectedValues());
                }
              }}
              loading={bulkAutoArchiveLoading}
            >
              <ArchiveIcon className="mr-2 size-4" />
              Auto Archive
            </Button>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkApprove(getSelectedValues())}
              loading={bulkApproveLoading}
            >
              <BadgeCheckIcon className="mr-2 size-4" />
              Approve
            </Button>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkArchive(getSelectedValues())}
            >
              <ArchiveIcon className="mr-2 size-4" />
              Archive All
            </Button>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkDelete(getSelectedValues())}
            >
              <TrashIcon className="mr-2 size-4" />
              Delete All
            </Button>
          </div>
        </div>
      </ExtraTooltip>
      <ExtraModal />
    </>
  );
}
