import { z } from "zod";
import { extraTier } from "@prisma/client";

export const changeextraStatusSchema = z.object({
  email: z.string().email(),
  lemonSqueezyCustomerId: z.coerce.number().optional(),
  emailAccountsAccess: z.coerce.number().optional(),
  period: z.enum([
    extraTier.BASIC_MONTHLY,
    extraTier.BASIC_ANNUALLY,
    extraTier.PRO_MONTHLY,
    extraTier.PRO_ANNUALLY,
    extraTier.BUSINESS_MONTHLY,
    extraTier.BUSINESS_ANNUALLY,
    extraTier.COPILOT_MONTHLY,
    extraTier.LIFETIME,
  ]),
  count: z.coerce.number().optional(),
  upgrade: z.boolean(),
});
export type ChangeextraStatusOptions = z.infer<typeof changeextraStatusSchema>;

export const adminProcessHistorySchema = z.object({
  email: z.string().email(),
  historyId: z.number().optional(),
  startHistoryId: z.number().optional(),
});
export type AdminProcessHistoryOptions = z.infer<
  typeof adminProcessHistorySchema
>;
