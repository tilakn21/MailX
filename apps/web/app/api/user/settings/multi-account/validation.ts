import { z } from "zod";

export const saveMultiAccountextraBody = z.object({
  emailAddresses: z
    .array(
      z.object({
        email: z.string(),
      }),
    )
    .optional(),
});
export type SaveMultiAccountextraBody = z.infer<
  typeof saveMultiAccountextraBody
>;
