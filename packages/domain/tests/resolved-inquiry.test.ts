import { describe, expect, it } from "vitest";

import {
  InquiryResolutionError,
  resolveReviewedInquiry,
  type InquiryExtraction,
  type InquiryReviewDecision,
} from "../src/index";

const reviewedAt = new Date("2026-08-26T08:00:00.000Z");

function createExtraction(requirementRequiresReview = false): InquiryExtraction {
  return {
    guests: {
      value: 65,
      confidence: 0.99,
      source: "65 people",
      requiresReview: false,
    },
    rooms: {
      value: 35,
      confidence: 0.99,
      source: "35 rooms",
      requiresReview: false,
    },
    startDate: {
      value: "2026-10-14",
      confidence: 0.99,
      source: "2026-10-14",
      requiresReview: false,
    },
    endDate: {
      value: "2026-10-16",
      confidence: 0.99,
      source: "2026-10-16",
      requiresReview: false,
    },
    budgetCents: {
      value: 18_000_000,
      confidence: 0.99,
      source: "SEK 180,000",
      requiresReview: false,
    },
    requirements: [
      {
        value: "late checkout",
        confidence: requirementRequiresReview ? 0.93 : 0.99,
        source: "late checkout",
        requiresReview: requirementRequiresReview,
      },
    ],
  };
}

describe("resolveReviewedInquiry", () => {
  it("derives downstream input when no review is required", () => {
    const result = resolveReviewedInquiry(createExtraction(), []);

    expect(result).toEqual({
      guests: 65,
      rooms: 35,
      startDate: "2026-10-14",
      endDate: "2026-10-16",
      budgetCents: 18_000_000,
      requirements: ["late checkout"],
    });
  });

  it("returns null while a review issue is unresolved", () => {
    const result = resolveReviewedInquiry(createExtraction(true), []);

    expect(result).toBeNull();
  });

  it("uses an accepted human decision", () => {
    const decision: InquiryReviewDecision = {
      field: "requirements.0",
      kind: "accepted",
      resolvedValue: "late checkout",
      reviewedAt,
    };

    const result = resolveReviewedInquiry(createExtraction(true), [decision]);

    expect(result?.requirements).toEqual(["late checkout"]);
  });

  it("uses a corrected human value", () => {
    const extraction = createExtraction();

    const reviewableExtraction: InquiryExtraction = {
      ...extraction,
      startDate: {
        value: null,
        confidence: 0,
        source: "14-16 October",
        requiresReview: true,
      },
    };

    const result = resolveReviewedInquiry(reviewableExtraction, [
      {
        field: "startDate",
        kind: "corrected",
        resolvedValue: "2026-10-14",
        reviewedAt,
      },
    ]);

    expect(result?.startDate).toBe("2026-10-14");
  });

  it("rejects a stale decision", () => {
    expect(() =>
      resolveReviewedInquiry(createExtraction(), [
        {
          field: "guests",
          kind: "accepted",
          resolvedValue: 65,
          reviewedAt,
        },
      ]),
    ).toThrow(InquiryResolutionError);
  });

  it("rejects a tampered accepted value", () => {
    expect(() =>
      resolveReviewedInquiry(createExtraction(true), [
        {
          field: "requirements.0",
          kind: "accepted",
          resolvedValue: "free luxury upgrades",
          reviewedAt,
        },
      ]),
    ).toThrow(InquiryResolutionError);
  });
});
