import { describe, expect, it } from "vitest";

import {
  createInquiryInputSchema,
  inquiryIdSchema,
} from "../src/index";

describe("createInquiryInputSchema", () => {
  it("trims and accepts a valid customer inquiry", () => {
    const result = createInquiryInputSchema.parse({
      rawText: "   We need 45 rooms for our company offsite.   ",
    });

    expect(result.rawText).toBe(
      "We need 45 rooms for our company offsite.",
    );
  });

  it("rejects an inquiry that is too short", () => {
    const result = createInquiryInputSchema.safeParse({
      rawText: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects non-string input", () => {
    const result = createInquiryInputSchema.safeParse({
      rawText: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("inquiryIdSchema", () => {
  it("accepts a UUID", () => {
    expect(
      inquiryIdSchema.safeParse(
        "3ac7f2de-7430-47d6-b63f-9c899eafd248",
      ).success,
    ).toBe(true);
  });

  it("rejects an invalid identifier", () => {
    expect(inquiryIdSchema.safeParse("not-a-uuid").success).toBe(
      false,
    );
  });
});
