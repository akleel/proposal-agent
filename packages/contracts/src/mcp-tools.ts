import {
  z,
} from "zod";

import {
  proposalDraftIdSchema,
} from "./proposal-draft";
import {
  calculateInquiryPricingInputSchema,
} from "./pricing-selection";

export const mcpSearchProductsInputSchema =
  z.object({
    query:
      z.string()
        .trim()
        .max(100)
        .optional(),
    limit:
      z.number()
        .int()
        .min(1)
        .max(50)
        .optional(),
  }).strict();

export const mcpCalculatePricingInputSchema =
  calculateInquiryPricingInputSchema;

export const mcpValidateProposalInputSchema =
  z.object({
    proposalDraftId:
      proposalDraftIdSchema,
  }).strict();

export const mcpCreateDraftInputSchema =
  calculateInquiryPricingInputSchema;

export type McpSearchProductsInputContract =
  z.infer<
    typeof mcpSearchProductsInputSchema
  >;

export type McpCalculatePricingInputContract =
  z.infer<
    typeof mcpCalculatePricingInputSchema
  >;

export type McpValidateProposalInputContract =
  z.infer<
    typeof mcpValidateProposalInputSchema
  >;

export type McpCreateDraftInputContract =
  z.infer<
    typeof mcpCreateDraftInputSchema
  >;
