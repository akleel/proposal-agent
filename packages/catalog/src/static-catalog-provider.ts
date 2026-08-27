import type {
  CatalogProvider,
  PricingCatalog,
} from "@proposal-agent/application";
import type {
  CatalogItem,
} from "@proposal-agent/domain";

export const DEMO_CATALOG_VERSION =
  "2026-08-demo-v1";

const demoCatalogItems:
  readonly CatalogItem[] =
  Object.freeze([
    Object.freeze({
      id: "hotel_room_night",
      name: "Hotel room",
      currency: "SEK",
      unitPriceMinor: 150_000,
      pricingBasis:
        "per_room_night",
      active: true,
    }),
    Object.freeze({
      id: "meeting_room_day",
      name: "Meeting room",
      currency: "SEK",
      unitPriceMinor: 600_000,
      pricingBasis:
        "per_day",
      active: true,
    }),
    Object.freeze({
      id: "breakfast_person",
      name: "Breakfast",
      currency: "SEK",
      unitPriceMinor: 18_000,
      pricingBasis:
        "per_person",
      active: true,
    }),
    Object.freeze({
      id: "dinner_person",
      name: "Dinner",
      currency: "SEK",
      unitPriceMinor: 45_000,
      pricingBasis:
        "per_person",
      active: true,
    }),
    Object.freeze({
      id: "late_checkout_room",
      name: "Late checkout",
      currency: "SEK",
      unitPriceMinor: 30_000,
      pricingBasis:
        "per_room",
      active: true,
    }),
  ]);

const demoCatalog:
  PricingCatalog =
  Object.freeze({
    version:
      DEMO_CATALOG_VERSION,
    items:
      demoCatalogItems,
  });

export class StaticCatalogProvider
  implements CatalogProvider
{
  public async getCurrentCatalog():
    Promise<PricingCatalog> {
    return demoCatalog;
  }
}
