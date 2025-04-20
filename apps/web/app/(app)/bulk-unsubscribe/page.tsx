import { PermissionsCheck } from "@/app/(app)/PermissionsCheck";
import { BulkUnsubscribe } from "./BulkUnsubscribe";
import { checkAndRedirectForUpgrade } from "@/utils/extra-features";

export default async function BulkUnsubscribePage() {
  await checkAndRedirectForUpgrade();
  return (
    <>
      <PermissionsCheck />
      <BulkUnsubscribe />
    </>
  );
}
