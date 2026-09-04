import { describe, expect, it } from "vitest";

import {
  createInquiryReviewDecision,
  InquiryReviewDecisionError,
  type InquiryExtraction,
} from "../src/index";

function createExtraction(): InquiryExtraction {
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
      source: "35 hotel rooms",
      requiresReview: false,
    },
    startDate: {
      value: null,
      confidence: 0,
      source: "14-16 October",
      requiresReview: true,
    },
    endDate: {
      value: null,
      confidence: 0,
      source: "14-16 October",
      requiresReview: true,
    },
    requirements: [
      {
        value: "late checkout on the final day",
        confidence: 0.94,
        source: "preferably late checkout on the final day",
        requiresReview: true,
      },
    ],
  };
}

describe("createInquiryReviewDecision", () => {
  it("accepts an existing flagged value", () => {
    const reviewedAt = new Date("2026-08-25T08:00:00.000Z");

    const decision = createInquiryReviewDecision(
      createExtraction(),
      {
        field: "requirements.0",
        kind: "accepted",
      },
      reviewedAt,
    );

    expect(decision).toEqual({
      field: "requirements.0",
      kind: "accepted",
      resolvedValue: "late checkout on the final day",
      reviewedAt,
    });
  });

  it("requires correction for a null AI value", () => {
    expect(() =>
      createInquiryReviewDecision(
        createExtraction(),
        {
          field: "startDate",
          kind: "accepted",
        },
        new Date(),
      ),
    ).toThrow(InquiryReviewDecisionError);
  });

  it("parses a corrected ISO date", () => {
    const decision = createInquiryReviewDecision(
      createExtraction(),
      {
        field: "startDate",
        kind: "corrected",
        correctedValue: "2026-10-14",
      },
      new Date("2026-08-25T08:00:00.000Z"),
    );

    expect(decision.resolvedValue).toBe("2026-10-14");
  });

  it("rejects an impossible calendar date", () => {
    expect(() =>
      createInquiryReviewDecision(
        createExtraction(),
        {
          field: "startDate",
          kind: "corrected",
          correctedValue: "2026-02-30",
        },
        new Date(),
      ),
    ).toThrow("valid calendar date");
  });

  it("rejects a decision for an unflagged field", () => {
    expect(() =>
      createInquiryReviewDecision(
        createExtraction(),
        {
          field: "guests",
          kind: "accepted",
        },
        new Date(),
      ),
    ).toThrow("does not require human review");
  });
});
