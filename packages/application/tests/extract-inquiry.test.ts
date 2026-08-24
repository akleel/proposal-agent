import type { InquiryExtraction } from "@proposal-agent/domain";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  extractInquiry,
  type InquiryExtractor,
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
      confidence: 0.97,
      source: "35 rooms",
      requiresReview: false,
    },
    startDate: {
      value: "2026-10-14",
      confidence: 0.9,
      source: "14-16 October",
      requiresReview: true,
    },
    endDate: {
      value: "2026-10-16",
      confidence: 0.9,
      source: "14-16 October",
      requiresReview: true,
    },
    budgetCents: {
      value: 18_000_000,
      confidence: 0.98,
      source: "SEK 180,000",
      requiresReview: false,
    },
    requirements: [
      {
        value: "Meeting space for everyone",
        confidence: 0.95,
        source: "meeting space for everyone",
        requiresReview: false,
      },
    ],
  };
}

describe("extractInquiry", () => {
  it("normalizes input and delegates extraction to the configured port", async () => {
    const extraction = createExtraction();

    const extract = vi
      .fn<InquiryExtractor["extract"]>()
      .mockResolvedValue(extraction);

    const extractor: InquiryExtractor = {
      extract,
    };

    const result = await extractInquiry(
      {
        extractor,
      },
      {
        rawText:
          "  We need 35 rooms for 65 people in Stockholm.  ",
      },
    );

    expect(extract).toHaveBeenCalledOnce();
    expect(extract).toHaveBeenCalledWith(
      "We need 35 rooms for 65 people in Stockholm.",
    );
    expect(result).toBe(extraction);
  });

  it("rejects blank input before invoking the extractor", async () => {
    const extract = vi
      .fn<InquiryExtractor["extract"]>();

    const extractor: InquiryExtractor = {
      extract,
    };

    await expect(
      extractInquiry(
        {
          extractor,
        },
        {
          rawText: "   ",
        },
      ),
    ).rejects.toThrow("Inquiry text cannot be empty.");

    expect(extract).not.toHaveBeenCalled();
  });
});
