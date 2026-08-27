import "server-only";

import type {
  CatalogProvider,
  PricingCatalog,
} from "@proposal-agent/application";
import type {
  CatalogItem,
} from "@proposal-agent/domain";

const demoCatalogItems:
  readonly CatalogItem[] = [
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
  ];

const demoCatalog:
  PricingCatalog = {
    version: "2026-08-demo-v1",
    items: demoCatalogItems,
  };

export class StaticCatalogProvider
  implements CatalogProvider
{
  public async getCurrentCatalog():
    Promise<PricingCatalog> {
    return demoCatalog;
  }
}
