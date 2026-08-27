import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateInquiryPricingInputSchema,
} from "../src/index";

const inquiryId =
  "3ac7f2de-7430-47d6-b63f-9c899eafd248";

describe("calculateInquiryPricingInputSchema", () => {
  it("accepts ids and coerces form occurrence strings", () => {
    const result =
      calculateInquiryPricingInputSchema.parse({
        inquiryId,
        selections: [
          {
            catalogItemId:
              "breakfast_person",
            occurrences: "2",
          },
        ],
      });

    expect(result).toEqual({
      inquiryId,
      selections: [
        {
          catalogItemId:
            "breakfast_person",
          occurrences: 2,
        },
      ],
    });
  });

  it("rejects an empty selection", () => {
    const result =
      calculateInquiryPricingInputSchema.safeParse({
        inquiryId,
        selections: [],
      });

    expect(result.success).toBe(false);
  });

  it("rejects invalid occurrences", () => {
    const result =
      calculateInquiryPricingInputSchema.safeParse({
        inquiryId,
        selections: [
          {
            catalogItemId:
              "breakfast_person",
            occurrences: "0",
          },
        ],
      });

    expect(result.success).toBe(false);
  });

  it("rejects caller supplied authoritative pricing fields", () => {
    const result =
      calculateInquiryPricingInputSchema.safeParse({
        inquiryId,
        selections: [
          {
            catalogItemId:
              "breakfast_person",
            occurrences: "1",
            unitPriceMinor: 1,
            lineTotalMinor: 1,
          },
        ],
      });

    expect(result.success).toBe(false);
  });
});
