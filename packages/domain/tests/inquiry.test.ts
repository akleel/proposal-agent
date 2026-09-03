import { describe, expect, it } from "vitest";

import { getReviewIssues, type InquiryExtraction } from "../src/index";

describe("getReviewIssues", () => {
  it("returns requirements that need human review", () => {
    const extraction: InquiryExtraction = {
      guests: {
        value: 65,
        confidence: 0.99,
        source: "for 65 people",
        requiresReview: false,
      },
      rooms: {
        value: 45,
        confidence: 0.96,
        source: "around 45 rooms",
        requiresReview: false,
      },
      startDate: {
        value: "2026-10-12",
        confidence: 0.98,
        source: "October 12-14",
        requiresReview: false,
      },
      endDate: {
        value: "2026-10-14",
        confidence: 0.98,
        source: "October 12-14",
        requiresReview: false,
      },
      budgetCents: {
        value: 2800000,
        confidence: 0.95,
        source: "budget around SEK 28k",
        requiresReview: false,
      },
      requirements: [
        {
          value: "Late checkout",
          confidence: 0.62,
          source: "preferably late checkout",
          requiresReview: true,
        },
      ],
    };

    expect(getReviewIssues(extraction)).toEqual([
      {
        field: "requirements.0",
        source: "preferably late checkout",
        confidence: 0.62,
      },
    ]);
  });
});
