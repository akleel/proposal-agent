import { z } from "zod";

import { inquiryIdSchema } from "./create-inquiry";

const catalogItemIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_]+$/, "Catalog item identifier is invalid.");

const occurrencesSchema = z.preprocess((value) => {
  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    return Number(value);
  }

  return value;
}, z.number().int().positive().max(1000));

export const catalogSelectionInputSchema = z
  .object({
    catalogItemId: catalogItemIdSchema,
    occurrences: occurrencesSchema,
  })
  .strict();

export const calculateInquiryPricingInputSchema = z
  .object({
    inquiryId: inquiryIdSchema,
    selections: z.array(catalogSelectionInputSchema).min(1).max(20),
  })
  .strict();

export type CalculateInquiryPricingInputContract = z.infer<
  typeof calculateInquiryPricingInputSchema
>;
