import { describe, expect, it } from "vitest";

import { extractedInquirySchema } from "../src/index";

describe("extractedInquirySchema source semantics", () => {
  it("accepts null source when extracted information is absent", () => {
    const result = extractedInquirySchema.safeParse({
      guests: {
        value: null,
        confidence: 0,
        source: null,
        requiresReview: true,
      },
      rooms: {
        value: null,
        confidence: 0,
        source: null,
        requiresReview: true,
      },
      startDate: {
        value: null,
        confidence: 0,
        source: null,
        requiresReview: true,
      },
      endDate: {
        value: null,
        confidence: 0,
        source: null,
        requiresReview: true,
      },
      budgetCents: {
        value: null,
        confidence: 0,
        source: null,
        requiresReview: true,
      },
      requirements: [],
    });

    expect(result.success).toBe(true);
  });
});
