import "server-only";

import { createHash } from "node:crypto";

import {
  GeminiCatalogMatcher,
  type CatalogMatchInput,
  type CatalogMatcher,
} from "@proposal-agent/ai";
import {
  PostgresInquiryCatalogMatchRepository,
  type PersistedInquiryCatalogMatch,
} from "@proposal-agent/db";
import type { ResolvedInquiry } from "@proposal-agent/domain";

import { getDatabasePool } from "./database";
import {
  matchProposalesCatalog,
  type ProposalesCatalog,
  type ProposalesCatalogMatch,
} from "./proposales";

interface LexicalCatalogState {
  readonly match: ProposalesCatalogMatch;
  readonly semanticRequirementIndexes: readonly number[];
}

function createRepository(): PostgresInquiryCatalogMatchRepository {
  return new PostgresInquiryCatalogMatchRepository(getDatabasePool());
}

function createCatalogMatcher(): CatalogMatcher {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY for semantic catalog matching.");
  }

  const model = process.env.GEMINI_MODEL;

  return model
    ? new GeminiCatalogMatcher({
        apiKey,
        model,
      })
    : new GeminiCatalogMatcher({
        apiKey,
      });
}

function createInputHash(inquiry: ResolvedInquiry, catalog: ProposalesCatalog): string {
  const canonicalInput = {
    inquiry: {
      guests: inquiry.guests,
      rooms: inquiry.rooms,
      startDate: inquiry.startDate,
      endDate: inquiry.endDate,
      requirements: inquiry.requirements,
    },
    catalog: {
      companyId: catalog.companyId,
      language: catalog.language,
      products: catalog.products
        .map((product) => ({
          variationId: product.variationId,
          title: product.title,
          description: product.description,
        }))
        .toSorted((left, right) => left.variationId - right.variationId),
    },
  };

  return createHash("sha256").update(JSON.stringify(canonicalInput)).digest("hex");
}

function buildLexicalState(
  inquiry: ResolvedInquiry,
  catalog: ProposalesCatalog,
): LexicalCatalogState {
  const match = matchProposalesCatalog(catalog, inquiry.requirements);

  const semanticRequirementIndexes: number[] = [];

  for (let index = 0; index < inquiry.requirements.length; index += 1) {
    const requirement = inquiry.requirements[index];

    if (requirement === undefined) {
      continue;
    }

    const individualMatch = matchProposalesCatalog(catalog, [requirement]);

    if (individualMatch.products.length === 0 && individualMatch.unmatchedRequirements.length > 0) {
      semanticRequirementIndexes.push(index);
    }
  }

  return {
    match,
    semanticRequirementIndexes,
  };
}

function materializePersistedMatch(
  persisted: PersistedInquiryCatalogMatch,
  inquiry: ResolvedInquiry,
  catalog: ProposalesCatalog,
): ProposalesCatalogMatch | null {
  const availableVariationIds = new Set(catalog.products.map((product) => product.variationId));

  if (
    persisted.matchedVariationIds.some((variationId) => !availableVariationIds.has(variationId))
  ) {
    return null;
  }

  const unmatchedRequirements: string[] = [];

  for (const index of persisted.unmatchedRequirementIndexes) {
    const requirement = inquiry.requirements[index];

    if (requirement === undefined) {
      return null;
    }

    unmatchedRequirements.push(requirement);
  }

  const matchedVariationIds = new Set(persisted.matchedVariationIds);

  return {
    products: catalog.products.filter((product) => matchedVariationIds.has(product.variationId)),
    unmatchedRequirements,
  };
}

function createSemanticInput(
  inquiry: ResolvedInquiry,
  catalog: ProposalesCatalog,
  requirementIndexes: readonly number[],
): CatalogMatchInput {
  const requirements = requirementIndexes.map((index) => {
    const requirement = inquiry.requirements[index];

    if (requirement === undefined) {
      throw new Error("Semantic catalog matching received an invalid requirement index.");
    }

    return requirement;
  });

  return {
    requirements,
    context: {
      guests: inquiry.guests,
      rooms: inquiry.rooms,
      startDate: inquiry.startDate,
      endDate: inquiry.endDate,
    },
    catalog: catalog.products.map((product) => ({
      variationId: product.variationId,
      title: product.title,
      description: product.description,
    })),
  };
}

export async function resolveProposalesCatalogMatch(
  inquiryId: string,
  inquiry: ResolvedInquiry,
  catalog: ProposalesCatalog,
): Promise<ProposalesCatalogMatch> {
  const repository = createRepository();
  const inputHash = createInputHash(inquiry, catalog);

  const persisted = await repository.findByInquiryId(inquiryId);

  if (persisted?.inputHash === inputHash) {
    const match = materializePersistedMatch(persisted, inquiry, catalog);

    if (match) {
      return match;
    }
  }

  const lexicalState = buildLexicalState(inquiry, catalog);

  if (lexicalState.semanticRequirementIndexes.length === 0) {
    const savedMatch: PersistedInquiryCatalogMatch = {
      inquiryId,
      inputHash,
      matchedVariationIds: lexicalState.match.products.map((product) => product.variationId),
      unmatchedRequirementIndexes: [],
      resolvedAt: new Date(),
    };

    await repository.save(savedMatch);

    return lexicalState.match;
  }

  const semanticInput = createSemanticInput(
    inquiry,
    catalog,
    lexicalState.semanticRequirementIndexes,
  );

  let semanticResult;

  try {
    semanticResult = await createCatalogMatcher().match(semanticInput);
  } catch (error) {
    console.error(
      "Semantic Proposales catalog matching failed; using deterministic lexical fallback.",
      error,
    );

    return lexicalState.match;
  }

  const matchedVariationIds = new Set(
    lexicalState.match.products.map((product) => product.variationId),
  );

  for (const variationId of semanticResult.matchedVariationIds) {
    matchedVariationIds.add(variationId);
  }

  const unmatchedRequirementIndexes = semanticResult.unmatchedRequirementIndexes.map(
    (semanticIndex) => {
      const originalIndex = lexicalState.semanticRequirementIndexes[semanticIndex];

      if (originalIndex === undefined) {
        throw new Error("Semantic catalog matcher returned an invalid requirement mapping.");
      }

      return originalIndex;
    },
  );

  const savedMatch: PersistedInquiryCatalogMatch = {
    inquiryId,
    inputHash,
    matchedVariationIds: [...matchedVariationIds].sort((left, right) => left - right),
    unmatchedRequirementIndexes: [...new Set(unmatchedRequirementIndexes)].sort(
      (left, right) => left - right,
    ),
    resolvedAt: new Date(),
  };

  await repository.save(savedMatch);

  const match = materializePersistedMatch(savedMatch, inquiry, catalog);

  if (!match) {
    throw new Error("The semantic catalog match could not be validated against the live catalog.");
  }

  return match;
}

/**
 * Used by proposal creation.
 *
 * This never calls Gemini. The POST boundary may use a persisted semantic
 * decision only when it still matches the current reviewed inquiry and catalog.
 */
export async function getPersistedProposalesCatalogMatch(
  inquiryId: string,
  inquiry: ResolvedInquiry,
  catalog: ProposalesCatalog,
): Promise<ProposalesCatalogMatch | null> {
  const persisted = await createRepository().findByInquiryId(inquiryId);

  if (!persisted) {
    return null;
  }

  if (persisted.inputHash !== createInputHash(inquiry, catalog)) {
    return null;
  }

  return materializePersistedMatch(persisted, inquiry, catalog);
}
