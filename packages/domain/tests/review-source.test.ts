import { describe, expect, it } from "vitest";

import { getReviewIssues, type InquiryExtraction } from "../src/index";

describe("review issues with absent evidence", () => {
  it("preserves null source for a missing field", () => {
    const extraction: InquiryExtraction = {
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
        requiresReview: false,
      },
      startDate: {
        value: null,
        confidence: 0,
        source: null,
        requiresReview: false,
      },
      endDate: {
        value: null,
        confidence: 0,
        source: null,
        requiresReview: false,
      },
      budgetCents: {
        value: null,
        confidence: 0,
        source: null,
        requiresReview: false,
      },
      requirements: [],
    };

    expect(getReviewIssues(extraction)).toEqual([
      {
        field: "guests",
        source: null,
        confidence: 0,
      },
    ]);
  });
});
