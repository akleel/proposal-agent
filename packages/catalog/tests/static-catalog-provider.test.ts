import { describe, expect, it } from "vitest";

import { DEMO_CATALOG_VERSION, StaticCatalogProvider } from "../src/index";

describe("StaticCatalogProvider", () => {
  it("returns the authoritative demo catalog", async () => {
    const provider = new StaticCatalogProvider();

    const catalog = await provider.getCurrentCatalog();

    expect(catalog.version).toBe(DEMO_CATALOG_VERSION);

    expect(catalog.items).toEqual([
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
        id: "breakfast_person",
        name: "Breakfast",
        currency: "SEK",
        unitPriceMinor: 18_000,
        pricingBasis: "per_person",
        active: true,
      },
      {
        id: "dinner_person",
        name: "Dinner",
        currency: "SEK",
        unitPriceMinor: 45_000,
        pricingBasis: "per_person",
        active: true,
      },
      {
        id: "late_checkout_room",
        name: "Late checkout",
        currency: "SEK",
        unitPriceMinor: 30_000,
        pricingBasis: "per_room",
        active: true,
      },
    ]);
  });

  it("exposes a runtime-frozen catalog", async () => {
    const provider = new StaticCatalogProvider();

    const catalog = await provider.getCurrentCatalog();

    expect(Object.isFrozen(catalog)).toBe(true);

    expect(Object.isFrozen(catalog.items)).toBe(true);

    for (const item of catalog.items) {
      expect(Object.isFrozen(item)).toBe(true);
    }
  });
});
