import type { NextRequest } from "next/server";
import prisma from "@/utils/prisma";
import { hashApiKey } from "@/utils/api-key";
import { getGmailClientWithRefresh } from "@/utils/gmail/client";
import { SafeError } from "@/utils/error";

export const API_KEY_HEADER = "API-Key";

/**
 * Validates an API key from the request headers and returns the associated user
 * @param request The Next.js request object
 * @returns The user object or null if the API key is invalid or missing
 * @throws SafeError if the API key is invalid or missing
 */
export async function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get(API_KEY_HEADER);

  if (!apiKey) throw new SafeError("Missing API key", 401);

  const user = await getUserFromApiKey(apiKey);

  if (!user) throw new SafeError("Invalid API key", 401);

  return { user };
}

/**
 * Gets a user from an API key
 * @param secretKey The API key to validate
 * @returns The user object or null if the API key is invalid
 */
export async function getUserFromApiKey(secretKey: string) {
  const hashedKey = hashApiKey(secretKey);

  const result = await prisma.apiKey.findUnique({
    where: { hashedKey, isActive: true },
    select: {
      user: {
        select: {
          id: true,
          accounts: {
            select: {
              access_token: true,
              refresh_token: true,
              expires_at: true,
              providerAccountId: true,
            },
            where: { provider: "google" },
            take: 1,
          },
        },
      },
      isActive: true,
    },
  });

  return result?.user || null;
}

/**
 * Validates an API key and gets a Gmail client for the user
 * @param request The Next.js request object
 * @returns The Gmail client and user ID
 * @throws SafeError if authentication fails
 */
export async function validateApiKeyAndGetGmailClient(request: NextRequest) {
  const { user } = await validateApiKey(request);

  const account = user.accounts[0];

  if (!account) throw new SafeError("Missing account", 401);

  if (!account.access_token || !account.refresh_token || !account.expires_at)
    throw new SafeError("Missing access token", 401);

  const gmail = await getGmailClientWithRefresh(
    {
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiryDate: account.expires_at,
    },
    account.providerAccountId,
  );

  if (!gmail) throw new SafeError("Error refreshing Gmail access token", 401);

  return { gmail, accessToken: account.access_token, userId: user.id };
}
