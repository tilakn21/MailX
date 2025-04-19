import NextAuth from "next-auth";
import { getAuthOptions, authOptions } from "@/utils/auth";
import { createScopedLogger } from "@/utils/logger";

const logger = createScopedLogger("Auth API");

export const {
  handlers: { GET, POST },
  auth,
  signOut,
} = NextAuth((req) => {
  try {
    if (req?.url) {
      const url = new URL(req?.url);
      const consent = url.searchParams.get("consent");
      if (consent) {
        logger.info("Consent requested");
        return getAuthOptions({ consent: true });
      }
    }

    return authOptions;
  } catch (error) {
    logger.error("Auth configuration error", { error });
    // Log more detailed information about the error
    if (error instanceof Error) {
      logger.error(`Auth error details: ${error.message}`, { 
        name: error.name,
        stack: error.stack,
      });
    }
    throw error;
  }
});
