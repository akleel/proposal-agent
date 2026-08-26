import { z } from "zod";

import {
  inquiryIdSchema,
} from "./create-inquiry";

export const reviewDecisionKindSchema =
  z.enum([
    "accepted",
    "corrected",
  ]);

export const saveInquiryReviewDecisionInputSchema =
  z.object({
    inquiryId: inquiryIdSchema,
    field: z
      .string()
      .trim()
      .min(1)
      .max(128),
    kind: reviewDecisionKindSchema,
    correctedValue: z
      .string()
      .max(5_000)
      .optional()
      .default(""),
  });

export type SaveInquiryReviewDecisionInputContract =
  z.infer<
    typeof saveInquiryReviewDecisionInputSchema
  >;
