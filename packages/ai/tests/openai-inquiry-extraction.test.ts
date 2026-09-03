import { getReviewIssues } from "@proposal-agent/domain";
import { describe, expect, it } from "vitest";

import {
  modelInquiryExtractionSchema,
  toInquiryExtraction,
  type ModelInquiryExtraction,
} from "../src/index";

function createModelExtraction(): ModelInquiryExtraction {
  return {
    guests: {
      value: 65,
      confidence: 0.99,
      source: "65 people",
    },
    rooms: {
      value: 35,
      confidence: 0.98,
      source: "35 rooms",
    },
    startDate: {
      value: null,
      confidence: 0.8,
      source: "14-16 October",
    },
    endDate: {
      value: null,
      confidence: 0.8,
      source: "14-16 October",
    },
    budgetCents: {
      value: 18_000_000,
      confidence: 0.95,
      source: "SEK 180,000",
    },
    requirements: [
      {
        value: "Meeting space for everyone",
        confidence: 0.97,
        source: "meeting space for everyone",
      },
    ],
  };
}

describe("modelInquiryExtractionSchema", () => {
  it("rejects invalid confidence values", () => {
    const candidate = createModelExtraction();

    candidate.guests.confidence = 1.5;

    expect(() => modelInquiryExtractionSchema.parse(candidate)).toThrow();
  });

  it("accepts null source for absent information", () => {
    const candidate = createModelExtraction();

    candidate.rooms.value = null;
    candidate.rooms.confidence = 0;
    candidate.rooms.source = null;

    expect(() => modelInquiryExtractionSchema.parse(candidate)).not.toThrow();
  });

  it("rejects impossible calendar dates", () => {
    const candidate = createModelExtraction();

    candidate.startDate.value = "2026-02-30";
    candidate.startDate.source = "2026-02-30";

    expect(() => modelInquiryExtractionSchema.parse(candidate)).toThrow();
  });
});

describe("toInquiryExtraction", () => {
  const rawText =
    "We are 65 people and need 35 rooms from 14-16 October, " +
    "meeting space for everyone, with a budget of SEK 180,000.";

  it("keeps strongly supported fields out of review", () => {
    const extraction = toInquiryExtraction(rawText, createModelExtraction());

    expect(extraction.guests.requiresReview).toBe(false);
    expect(extraction.rooms.requiresReview).toBe(false);
    expect(extraction.budgetCents.requiresReview).toBe(false);
    expect(extraction.requirements[0]?.requiresReview).toBe(false);
  });

  it("requires review for null values", () => {
    const extraction = toInquiryExtraction(rawText, createModelExtraction());

    expect(extraction.startDate.requiresReview).toBe(true);
    expect(extraction.endDate.requiresReview).toBe(true);
  });

  it("preserves null source when information is absent", () => {
    const modelExtraction = createModelExtraction();

    modelExtraction.rooms.value = null;
    modelExtraction.rooms.confidence = 0;
    modelExtraction.rooms.source = null;

    const extraction = toInquiryExtraction("We are planning a company event.", modelExtraction);

    expect(extraction.rooms.value).toBeNull();
    expect(extraction.rooms.source).toBeNull();
    expect(extraction.rooms.requiresReview).toBe(true);
  });

  it("removes decorative wrapping quotes from source evidence", () => {
    const modelExtraction = createModelExtraction();

    modelExtraction.startDate.source = '"14-16 October"';

    modelExtraction.budgetCents.source = '"SEK 180,000"';

    const extraction = toInquiryExtraction(rawText, modelExtraction);

    expect(extraction.startDate.source).toBe("14-16 October");

    expect(extraction.budgetCents.source).toBe("SEK 180,000");
  });

  it("requires review when source evidence is fabricated", () => {
    const modelExtraction = createModelExtraction();

    modelExtraction.rooms.source = "forty luxury suites";

    const extraction = toInquiryExtraction(rawText, modelExtraction);

    expect(extraction.rooms.requiresReview).toBe(true);
  });

  it("requires review when a non-null value has no source", () => {
    const modelExtraction = createModelExtraction();

    modelExtraction.rooms.source = null;

    const extraction = toInquiryExtraction(rawText, modelExtraction);

    expect(extraction.rooms.value).toBe(35);
    expect(extraction.rooms.requiresReview).toBe(true);
  });

  it("does not trust a non-SEK budget for pricing", () => {
    const modelExtraction = createModelExtraction();

    modelExtraction.budgetCents.value = 2_800_000;
    modelExtraction.budgetCents.confidence = 0.99;
    modelExtraction.budgetCents.source = "EUR 28,000";

    const extraction = toInquiryExtraction("Customer budget is EUR 28,000.", modelExtraction);

    expect(extraction.budgetCents).toEqual({
      value: null,
      confidence: 0.99,
      source: "EUR 28,000",
      requiresReview: true,
    });
  });

  it("produces domain review issues deterministically", () => {
    const extraction = toInquiryExtraction(rawText, createModelExtraction());

    expect(getReviewIssues(extraction).map((issue) => issue.field)).toEqual([
      "startDate",
      "endDate",
    ]);
  });
});
