import type { InquiryExtraction } from "@proposal-agent/domain";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  FakeInquiryExtractor,
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
      confidence: 0.98,
      source: "35 rooms",
      requiresReview: false,
    },
    startDate: {
      value: null,
      confidence: 0.5,
      source: "October",
      requiresReview: true,
    },
    endDate: {
      value: null,
      confidence: 0.5,
      source: "October",
      requiresReview: true,
    },
    budgetCents: {
      value: 18_000_000,
      confidence: 0.99,
      source: "SEK 180,000",
      requiresReview: false,
    },
    requirements: [
      {
        value: "Meeting space",
        confidence: 0.95,
        source: "meeting space",
        requiresReview: false,
      },
    ],
  };
}

describe("FakeInquiryExtractor", () => {
  it("returns the configured extraction", async () => {
    const extraction = createExtraction();

    const extractor =
      new FakeInquiryExtractor(extraction);

    const result = await extractor.extract(
      "Company offsite inquiry",
    );

    expect(result).toBe(extraction);
  });

  it("records received inquiry text", async () => {
    const extractor =
      new FakeInquiryExtractor(createExtraction());

    await extractor.extract("First inquiry");
    await extractor.extract("Second inquiry");

    expect(extractor.inputs).toEqual([
      "First inquiry",
      "Second inquiry",
    ]);
  });
});
