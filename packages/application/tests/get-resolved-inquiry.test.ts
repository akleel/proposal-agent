import type { InquiryExtraction, InquiryReviewDecision } from "@proposal-agent/domain";
import { describe, expect, it } from "vitest";

import {
  getResolvedInquiry,
  type InquiryReviewRepository,
  type PersistedInquiryReview,
} from "../src/index";

const inquiryId = "3ac7f2de-7430-47d6-b63f-9c899eafd248";

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
        confidence: 0.93,
        source: "late checkout",
        requiresReview: true,
      },
    ],
  };
}

function createReview(decisions: readonly InquiryReviewDecision[]): PersistedInquiryReview {
  return {
    inquiryId,
    extraction: createExtraction(),
    extractedAt: new Date("2026-08-26T08:00:00.000Z"),
    decisions,
  };
}

class StaticReviewRepository implements InquiryReviewRepository {
  public constructor(private readonly review: PersistedInquiryReview | null) {}

  public async replaceExtraction(
    _inquiryId: string,
    _extraction: InquiryExtraction,
    _extractedAt: Date,
  ): Promise<void> {
    throw new Error("Not used by this test.");
  }

  public async findByInquiryId(requestedInquiryId: string): Promise<PersistedInquiryReview | null> {
    if (!this.review || requestedInquiryId !== this.review.inquiryId) {
      return null;
    }

    return this.review;
  }

  public async saveDecision(_inquiryId: string, _decision: InquiryReviewDecision): Promise<void> {
    throw new Error("Not used by this test.");
  }
}

describe("getResolvedInquiry", () => {
  it("reports when no extraction exists", async () => {
    const result = await getResolvedInquiry(
      {
        reviewRepository: new StaticReviewRepository(null),
      },
      inquiryId,
    );

    expect(result).toEqual({
      status: "not_extracted",
    });
  });

  it("blocks downstream use while review is unresolved", async () => {
    const result = await getResolvedInquiry(
      {
        reviewRepository: new StaticReviewRepository(createReview([])),
      },
      inquiryId,
    );

    expect(result).toEqual({
      status: "review_required",
    });
  });

  it("returns deterministic reviewed input when ready", async () => {
    const result = await getResolvedInquiry(
      {
        reviewRepository: new StaticReviewRepository(
          createReview([
            {
              field: "requirements.0",
              kind: "accepted",
              resolvedValue: "late checkout",
              reviewedAt: new Date("2026-08-26T08:05:00.000Z"),
            },
          ]),
        ),
      },
      inquiryId,
    );

    expect(result).toEqual({
      status: "ready",
      inquiry: {
        guests: 65,
        rooms: 35,
        startDate: "2026-10-14",
        endDate: "2026-10-16",
        budgetCents: 18_000_000,
        requirements: ["late checkout"],
      },
    });
  });
});
