import { PermissionsCheck } from "@/app/(app)/PermissionsCheck";
import { Stats } from "./Stats";
import { checkAndRedirectForUpgrade } from "@/utils/extra-features";

export default async function StatsPage() {
  await checkAndRedirectForUpgrade();
  return (
    <>
      <PermissionsCheck />
      <Stats />
    </>
  );
}
