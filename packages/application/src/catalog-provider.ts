import type {
  CatalogItem,
} from "@proposal-agent/domain";

export interface PricingCatalog {
  readonly version: string;
  readonly items:
    readonly CatalogItem[];
}

export interface CatalogProvider {
  getCurrentCatalog():
    Promise<PricingCatalog>;
}
