import { describe, expect, it } from "vitest";

import { normalizeCatalogMatchResolutions, type CatalogMatchInput } from "../src/catalog-match";

function createInput(): CatalogMatchInput {
  return {
    requirements: ["A normal room for the two of us", "Breakfast every morning", "Access to a spa"],
    context: {
      guests: 2,
      rooms: 1,
      startDate: "2026-10-14",
      endDate: "2026-10-17",
    },
    catalog: [
      {
        variationId: 188527,
        title: "Standard Double Room",
        description: "Standard room for two guests.",
      },
      {
        variationId: 188531,
        title: "Breakfast",
        description: "Breakfast buffet.",
      },
    ],
  };
}

describe("normalizeCatalogMatchResolutions", () => {
  it("keeps only supplied catalog identifiers and marks unresolved requirements", () => {
    const input = createInput();

    const result = normalizeCatalogMatchResolutions(input, [
      {
        requirementIndex: 0,
        variationIds: [188527],
      },
      {
        requirementIndex: 1,
        variationIds: [188531],
      },
      {
        requirementIndex: 2,
        variationIds: [],
      },
    ]);

    expect(result).toEqual({
      matchedVariationIds: [188527, 188531],
      unmatchedRequirementIndexes: [2],
    });
  });

  it("rejects a hallucinated variation identifier", () => {
    const input = createInput();

    expect(() =>
      normalizeCatalogMatchResolutions(input, [
        {
          requirementIndex: 0,
          variationIds: [999999],
        },
      ]),
    ).toThrow("not in the supplied catalog");
  });

  it("rejects a requirement index outside the supplied input", () => {
    const input = createInput();

    expect(() =>
      normalizeCatalogMatchResolutions(input, [
        {
          requirementIndex: 99,
          variationIds: [188527],
        },
      ]),
    ).toThrow("invalid requirement index");
  });
});
