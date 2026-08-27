import "server-only";

import {
  randomUUID,
} from "node:crypto";

import {
  OpenAIInquiryExtractor,
} from "@proposal-agent/ai";
import {
  calculateInquiryPricing,
  createInquiry,
  extractInquiryReview,
  getInquiry,
  getInquiryReview,
  saveInquiryReviewDecision,
} from "@proposal-agent/application";
import {
  PostgresInquiryRepository,
  PostgresInquiryReviewRepository,
} from "@proposal-agent/db";
import type {
  CatalogSelection,
  InquiryReviewDecisionKind,
} from "@proposal-agent/domain";

import {
  StaticCatalogProvider,
} from "@proposal-agent/catalog";
import {
  getDatabasePool,
} from "./database";

function createInquiryRepository() {
  return new PostgresInquiryRepository(
    getDatabasePool(),
  );
}

function createInquiryReviewRepository() {
  return new PostgresInquiryReviewRepository(
    getDatabasePool(),
  );
}

function createCatalogProvider():
  StaticCatalogProvider {
  return new StaticCatalogProvider();
}

function createInquiryExtractor():
  OpenAIInquiryExtractor {
  const apiKey =
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY for server-side inquiry extraction.",
    );
  }

  const model =
    process.env.OPENAI_MODEL;

  if (model) {
    return new OpenAIInquiryExtractor({
      apiKey,
      model,
    });
  }

  return new OpenAIInquiryExtractor({
    apiKey,
  });
}

export async function createInquiryUseCase(
  rawText: string,
) {
  return createInquiry(
    {
      repository:
        createInquiryRepository(),
      generateId: randomUUID,
      now: () => new Date(),
    },
    {
      rawText,
    },
  );
}

export async function getInquiryUseCase(
  id: string,
) {
  return getInquiry(
    {
      repository:
        createInquiryRepository(),
    },
    id,
  );
}

export async function extractPersistedInquiryUseCase(
  id: string,
) {
  return extractInquiryReview(
    {
      inquiryRepository:
        createInquiryRepository(),
      reviewRepository:
        createInquiryReviewRepository(),
      extractor:
        createInquiryExtractor(),
      now: () => new Date(),
    },
    id,
  );
}

export async function getPersistedInquiryReviewUseCase(
  id: string,
) {
  return getInquiryReview(
    {
      reviewRepository:
        createInquiryReviewRepository(),
    },
    id,
  );
}

export async function getCurrentPricingCatalogUseCase() {
  return createCatalogProvider()
    .getCurrentCatalog();
}

export async function calculatePersistedInquiryPricingUseCase(
  inquiryId: string,
  selections:
    readonly CatalogSelection[],
) {
  return calculateInquiryPricing(
    {
      reviewRepository:
        createInquiryReviewRepository(),
      catalogProvider:
        createCatalogProvider(),
    },
    {
      inquiryId,
      selections,
    },
  );
}

export interface SavePersistedInquiryReviewDecisionInput {
  readonly inquiryId: string;
  readonly field: string;
  readonly kind: InquiryReviewDecisionKind;
  readonly correctedValue?: string;
}

export async function savePersistedInquiryReviewDecisionUseCase(
  input:
    SavePersistedInquiryReviewDecisionInput,
) {
  return saveInquiryReviewDecision(
    {
      reviewRepository:
        createInquiryReviewRepository(),
      now: () => new Date(),
    },
    input,
  );
}
