import type { InquiryExtraction, InquiryReviewDecision } from "@proposal-agent/domain";
import { describe, expect, it } from "vitest";

import {
  extractInquiryReview,
  saveInquiryReviewDecision,
  type InquiryExtractor,
  type InquiryRepository,
  type InquiryReviewRepository,
  type PersistedInquiryReview,
} from "../src/index";

class MemoryInquiryRepository implements InquiryRepository {
  private readonly values = new Map<
    string,
    {
      readonly id: string;
      readonly rawText: string;
      readonly createdAt: Date;
    }
  >();

  public async create(inquiry: {
    readonly id: string;
    readonly rawText: string;
    readonly createdAt: Date;
  }): Promise<void> {
    this.values.set(inquiry.id, inquiry);
  }

  public async findById(id: string) {
    return this.values.get(id) ?? null;
  }
}

class MemoryReviewRepository implements InquiryReviewRepository {
  private review: PersistedInquiryReview | null = null;

  public async replaceExtraction(
    inquiryId: string,
    extraction: InquiryExtraction,
    extractedAt: Date,
  ): Promise<void> {
    this.review = {
      inquiryId,
      extraction,
      extractedAt,
      decisions: [],
    };
  }

  public async findByInquiryId(inquiryId: string): Promise<PersistedInquiryReview | null> {
    if (!this.review || this.review.inquiryId !== inquiryId) {
      return null;
    }

    return this.review;
  }

  public async saveDecision(inquiryId: string, decision: InquiryReviewDecision): Promise<void> {
    if (!this.review || this.review.inquiryId !== inquiryId) {
      throw new Error("Review not found.");
    }

    const decisions = this.review.decisions.filter((current) => current.field !== decision.field);

    this.review = {
      ...this.review,
      decisions: [...decisions, decision],
    };
  }
}

class StaticExtractor implements InquiryExtractor {
  public constructor(private readonly result: InquiryExtraction) {}

  public async extract(): Promise<InquiryExtraction> {
    return this.result;
  }
}

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
    requirements: [
      {
        value: "late checkout",
        confidence: 0.94,
        source: "preferably late checkout",
        requiresReview: true,
      },
    ],
  };
}

describe("inquiry review persistence use cases", () => {
  it("persists extraction and exposes unresolved issues", async () => {
    const inquiryRepository = new MemoryInquiryRepository();

    const reviewRepository = new MemoryReviewRepository();

    const inquiry = {
      id: "3ac7f2de-7430-47d6-b63f-9c899eafd248",
      rawText: "65 people, preferably late checkout.",
      createdAt: new Date("2026-08-25T08:00:00.000Z"),
    };

    await inquiryRepository.create(inquiry);

    const result = await extractInquiryReview(
      {
        inquiryRepository,
        reviewRepository,
        extractor: new StaticExtractor(createExtraction()),
        now: () => new Date("2026-08-25T08:01:00.000Z"),
      },
      inquiry.id,
    );

    expect(result).not.toBeNull();

    expect(result?.unresolvedReviewIssues.map((issue) => issue.field)).toEqual(["requirements.0"]);
  });

  it("persists an accepted human decision", async () => {
    const inquiryRepository = new MemoryInquiryRepository();

    const reviewRepository = new MemoryReviewRepository();

    const inquiry = {
      id: "3ac7f2de-7430-47d6-b63f-9c899eafd248",
      rawText: "65 people, preferably late checkout.",
      createdAt: new Date("2026-08-25T08:00:00.000Z"),
    };

    await inquiryRepository.create(inquiry);

    await extractInquiryReview(
      {
        inquiryRepository,
        reviewRepository,
        extractor: new StaticExtractor(createExtraction()),
        now: () => new Date("2026-08-25T08:01:00.000Z"),
      },
      inquiry.id,
    );

    const result = await saveInquiryReviewDecision(
      {
        reviewRepository,
        now: () => new Date("2026-08-25T08:02:00.000Z"),
      },
      {
        inquiryId: inquiry.id,
        field: "requirements.0",
        kind: "accepted",
      },
    );

    expect(result.decisions).toHaveLength(1);

    expect(result.unresolvedReviewIssues).toHaveLength(0);
  });
});
