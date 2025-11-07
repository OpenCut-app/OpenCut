import { z } from "zod";

export const exportWaitlistSchema = z.object({
  email: z.string().email().max(320),
});

export const exportWaitlistResponseSchema = z.object({
  success: z.boolean(),
  alreadySubscribed: z.boolean().optional(),
});

export type ExportWaitlistInput = z.infer<typeof exportWaitlistSchema>;
export type ExportWaitlistResponse = z.infer<
  typeof exportWaitlistResponseSchema
>;
