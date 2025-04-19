import { env } from "@/env";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("cron");

export function hasCronSecret(request: Request) {
  const authHeader = request.headers.get("authorization");
  const valid = authHeader === `Bearer ${env.CRON_SECRET}`;

  if (!valid) logger.error("Unauthorized cron request:", { authHeader });

  return valid;
}

export async function hasPostCronSecret(request: Request) {
  // Clone the request before consuming the body
  const clonedRequest = request.clone();
  const body = await clonedRequest.json();
  const valid = body.CRON_SECRET === env.CRON_SECRET;

  if (!valid) logger.error("Unauthorized cron request:", { body });

  return valid;
}

export function getCronSecretHeader() {
  return new Headers({ authorization: `Bearer ${env.CRON_SECRET}` });
}
