import type { CatalogItem } from "@proposal-agent/domain";

import type { CatalogProvider } from "./catalog-provider";

export interface SearchCatalogProductsInput {
  readonly query?: string;
  readonly limit?: number;
}

export interface SearchCatalogProductsResult {
  readonly catalogVersion: string;
  readonly products: readonly CatalogItem[];
}

export interface SearchCatalogProductsDependencies {
  readonly catalogProvider: CatalogProvider;
}

export class CatalogSearchError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CatalogSearchError";
  }
}

function validateLimit(value: number | undefined): number {
  const limit = value ?? 20;

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new CatalogSearchError("Catalog search limit must be an integer between 1 and 50.");
  }

  return limit;
}

function matchesQuery(item: CatalogItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const searchable = [item.id, item.name, item.pricingBasis].join(" ").toLocaleLowerCase("en-US");

  return searchable.includes(query);
}

export async function searchCatalogProducts(
  dependencies: SearchCatalogProductsDependencies,
  input: SearchCatalogProductsInput,
): Promise<SearchCatalogProductsResult> {
  const limit = validateLimit(input.limit);

  const query = input.query?.trim().toLocaleLowerCase("en-US") ?? "";

  const catalog = await dependencies.catalogProvider.getCurrentCatalog();

  const products = catalog.items
    .filter((item) => item.active && matchesQuery(item, query))
    .slice(0, limit)
    .map((item) => ({
      ...item,
    }));

  return {
    catalogVersion: catalog.version,
    products,
  };
}
