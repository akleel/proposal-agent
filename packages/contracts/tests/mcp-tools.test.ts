import { describe, expect, it } from "vitest";

import {
  mcpCalculatePricingInputSchema,
  mcpCreateDraftInputSchema,
  mcpSearchProductsInputSchema,
  mcpValidateProposalInputSchema,
} from "../src/index";

const inquiryId = "3ac7f2de-7430-47d6-b63f-9c899eafd248";

describe("MCP tool input contracts", () => {
  it("accepts product search input", () => {
    expect(
      mcpSearchProductsInputSchema.safeParse({
        query: "meeting room",
        limit: 5,
      }).success,
    ).toBe(true);
  });

  it("rejects unknown product search fields", () => {
    expect(
      mcpSearchProductsInputSchema.safeParse({
        query: "meeting room",
        unitPriceMinor: 1,
      }).success,
    ).toBe(false);
  });

  it("rejects caller-supplied pricing fields", () => {
    const input = {
      inquiryId,
      selections: [
        {
          catalogItemId: "hotel_room_night",
          occurrences: 1,
          unitPriceMinor: 1,
        },
      ],
    };

    expect(mcpCalculatePricingInputSchema.safeParse(input).success).toBe(false);

    expect(mcpCreateDraftInputSchema.safeParse(input).success).toBe(false);
  });

  it("accepts a proposal identifier for validation", () => {
    expect(
      mcpValidateProposalInputSchema.safeParse({
        proposalDraftId: "77a37479-886a-4a0a-a933-6e065cc5787c",
      }).success,
    ).toBe(true);
  });

  it("rejects approval claims on create_draft", () => {
    expect(
      mcpCreateDraftInputSchema.safeParse({
        inquiryId,
        selections: [
          {
            catalogItemId: "hotel_room_night",
            occurrences: 1,
          },
        ],
        approved: true,
      }).success,
    ).toBe(false);
  });
});
