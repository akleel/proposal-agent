import { describe, expect, it } from "vitest";

import { extractedInquirySchema } from "../src/index";

describe("extractedInquirySchema", () => {
  it("accepts valid grounded extraction data", () => {
    const result = extractedInquirySchema.safeParse({
      guests: { value: 65, confidence: 0.99, source: "65 people", requiresReview: false },
      rooms: { value: 45, confidence: 0.96, source: "45 rooms", requiresReview: false },
      startDate: { value: "2026-10-12", confidence: 0.98, source: "October 12", requiresReview: false },
      endDate: { value: "2026-10-14", confidence: 0.98, source: "October 14", requiresReview: false },
      budgetCents: { value: 2800000, confidence: 0.95, source: "EUR 28k", requiresReview: false },
      requirements: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects confidence values outside zero to one", () => {
    const result = extractedInquirySchema.safeParse({
      guests: { value: 65, confidence: 1.5, source: "65 people", requiresReview: false },
      rooms: { value: null, confidence: 0, source: "not provided", requiresReview: true },
      startDate: { value: null, confidence: 0, source: "not provided", requiresReview: true },
      endDate: { value: null, confidence: 0, source: "not provided", requiresReview: true },
      budgetCents: { value: null, confidence: 0, source: "not provided", requiresReview: true },
      requirements: [],
    });

    expect(result.success).toBe(false);
  });
});
