import { z } from "zod";

const confidenceSchema = z.number().min(0).max(1);

export const reviewableFieldSchema = <T extends z.ZodType>(
  valueSchema: T,
) =>
  z.object({
    value: valueSchema,
    confidence: confidenceSchema,
    source: z.string().min(1),
    requiresReview: z.boolean(),
  });

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const extractedInquirySchema = z.object({
  guests: reviewableFieldSchema(
    z.number().int().positive().nullable(),
  ),
  rooms: reviewableFieldSchema(
    z.number().int().nonnegative().nullable(),
  ),
  startDate: reviewableFieldSchema(
    isoDateSchema.nullable(),
  ),
  endDate: reviewableFieldSchema(
    isoDateSchema.nullable(),
  ),
  budgetCents: reviewableFieldSchema(
    z.number().int().nonnegative().nullable(),
  ),
  requirements: z.array(
    reviewableFieldSchema(z.string().min(1)),
  ),
});

export type ExtractedInquiryContract = z.infer<
  typeof extractedInquirySchema
>;
