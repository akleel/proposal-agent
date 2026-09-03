import type { CatalogProvider } from "../src/index";
import { CatalogSearchError, searchCatalogProducts } from "../src/index";
import { describe, expect, it } from "vitest";

function createCatalogProvider(): CatalogProvider {
  return {
    async getCurrentCatalog() {
      return {
        version: "catalog-test-v1",
        items: [
          {
            id: "hotel_room_night",
            name: "Hotel room",
            currency: "SEK",
            unitPriceMinor: 150_000,
            pricingBasis: "per_room_night",
            active: true,
          },
          {
            id: "meeting_room_day",
            name: "Meeting room",
            currency: "SEK",
            unitPriceMinor: 600_000,
            pricingBasis: "per_day",
            active: true,
          },
          {
            id: "retired_room",
            name: "Retired room",
            currency: "SEK",
            unitPriceMinor: 1,
            pricingBasis: "flat",
            active: false,
          },
        ],
      };
    },
  };
}

describe("searchCatalogProducts", () => {
  it("returns active products only", async () => {
    const result = await searchCatalogProducts(
      {
        catalogProvider: createCatalogProvider(),
      },
      {},
    );

    expect(result.catalogVersion).toBe("catalog-test-v1");

    expect(result.products.map((product) => product.id)).toEqual([
      "hotel_room_night",
      "meeting_room_day",
    ]);
  });

  it("searches identifiers and names case-insensitively", async () => {
    const result = await searchCatalogProducts(
      {
        catalogProvider: createCatalogProvider(),
      },
      {
        query: "ROOM",
      },
    );

    expect(result.products.map((product) => product.id)).toEqual([
      "hotel_room_night",
      "meeting_room_day",
    ]);
  });

  it("applies a deterministic result limit", async () => {
    const result = await searchCatalogProducts(
      {
        catalogProvider: createCatalogProvider(),
      },
      {
        query: "room",
        limit: 1,
      },
    );

    expect(result.products).toHaveLength(1);

    expect(result.products[0]?.id).toBe("hotel_room_night");
  });

  it("rejects an invalid limit", async () => {
    await expect(
      searchCatalogProducts(
        {
          catalogProvider: createCatalogProvider(),
        },
        {
          limit: 0,
        },
      ),
    ).rejects.toBeInstanceOf(CatalogSearchError);
  });
});
