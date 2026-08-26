import {
  describe,
  expect,
  it,
} from "vitest";

import {
  saveInquiryReviewDecisionInputSchema,
} from "../src/index";

describe(
  "saveInquiryReviewDecisionInputSchema",
  () => {
    it("accepts a correction request", () => {
      const result =
        saveInquiryReviewDecisionInputSchema.parse({
          inquiryId:
            "3ac7f2de-7430-47d6-b63f-9c899eafd248",
          field: "startDate",
          kind: "corrected",
          correctedValue: "2026-10-14",
        });

      expect(result.kind).toBe("corrected");
      expect(result.correctedValue).toBe(
        "2026-10-14",
      );
    });

    it("rejects an invalid inquiry id", () => {
      const result =
        saveInquiryReviewDecisionInputSchema.safeParse({
          inquiryId: "invalid",
          field: "requirements.0",
          kind: "accepted",
        });

      expect(result.success).toBe(false);
    });
  },
);
