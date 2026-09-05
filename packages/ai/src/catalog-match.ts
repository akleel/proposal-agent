export interface CatalogMatchCandidate {
  readonly variationId: number;
  readonly title: string;
  readonly description: string;
}

export interface CatalogMatchContext {
  readonly guests: number | null;
  readonly rooms: number | null;
  readonly startDate: string | null;
  readonly endDate: string | null;
}

export interface CatalogMatchInput {
  readonly requirements: readonly string[];
  readonly catalog: readonly CatalogMatchCandidate[];
  readonly context: CatalogMatchContext;
}

export interface CatalogMatchResolution {
  readonly requirementIndex: number;
  readonly variationIds: readonly number[];
}

export interface CatalogMatchResult {
  readonly matchedVariationIds: readonly number[];
  readonly unmatchedRequirementIndexes: readonly number[];
}

export interface CatalogMatcher {
  match(input: CatalogMatchInput): Promise<CatalogMatchResult>;
}

/**
 * Treats model output as untrusted data.
 *
 * Only catalog identifiers supplied in the input are allowed to survive this
 * boundary. Missing resolutions become unmatched requirements.
 */
export function normalizeCatalogMatchResolutions(
  input: CatalogMatchInput,
  resolutions: readonly CatalogMatchResolution[],
): CatalogMatchResult {
  const allowedVariationIds = new Set(input.catalog.map((product) => product.variationId));

  const matchedVariationIds = new Set<number>();
  const matchedRequirementIndexes = new Set<number>();

  for (const resolution of resolutions) {
    if (
      !Number.isSafeInteger(resolution.requirementIndex) ||
      resolution.requirementIndex < 0 ||
      resolution.requirementIndex >= input.requirements.length
    ) {
      throw new Error("Catalog matcher returned an invalid requirement index.");
    }

    for (const variationId of resolution.variationIds) {
      if (
        !Number.isSafeInteger(variationId) ||
        variationId <= 0 ||
        !allowedVariationIds.has(variationId)
      ) {
        throw new Error(
          "Catalog matcher returned a variation that is not in the supplied catalog.",
        );
      }

      matchedVariationIds.add(variationId);
      matchedRequirementIndexes.add(resolution.requirementIndex);
    }
  }

  const unmatchedRequirementIndexes = input.requirements
    .map((_, index) => index)
    .filter((index) => !matchedRequirementIndexes.has(index));

  return {
    matchedVariationIds: [...matchedVariationIds].sort((left, right) => left - right),
    unmatchedRequirementIndexes,
  };
}
