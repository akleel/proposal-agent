import { z } from "zod";

export const inquiryIdSchema = z.string().uuid();

export const createInquiryInputSchema = z.object({
  rawText: z
    .string()
    .trim()
    .min(10, "Inquiry must contain at least 10 characters.")
    .max(20_000, "Inquiry must not exceed 20,000 characters."),
});

export type CreateInquiryInputContract = z.infer<typeof createInquiryInputSchema>;
