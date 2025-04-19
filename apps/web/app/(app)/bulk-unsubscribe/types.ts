import type { NewsletterStatsResponse } from "@/app/api/user/stats/newsletters/route";
import type { NewsletterStatus } from "@prisma/client";
import type { UserLabel } from "@/hooks/useLabels";

export type Row = {
  name: string;
  lastUnsubscribeLink?: string | null;
  status?: NewsletterStatus | null;
  autoArchived?: { id?: string | null };
};

type Newsletter = NewsletterStatsResponse["newsletters"][number];

export interface RowProps {
  item: Newsletter;
  readPercentage: number;
  archivedEmails: number;
  archivedPercentage: number;

  onOpenNewsletter: (row: Newsletter) => void;
  labels: UserLabel[];
  userEmail: string;
  mutate: () => Promise<any>;
  selected: boolean;
  onSelectRow: () => void;
  onDoubleClick: () => void;
  hasUnsubscribeAccess: boolean;
  refetchPremium: () => Promise<any>;
  openPremiumModal: () => void;
  checked: boolean;
  onToggleSelect: (id: string) => void;
}
