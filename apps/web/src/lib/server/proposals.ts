import "server-only";

import { randomUUID } from "node:crypto";

import { createProposalDraft, getProposalDraft } from "@proposal-agent/application";
import {
  PostgresInquiryReviewRepository,
  PostgresProposalDraftRepository,
} from "@proposal-agent/db";
import type { CatalogSelection } from "@proposal-agent/domain";

import { StaticCatalogProvider } from "@proposal-agent/catalog";
import { getDatabasePool } from "./database";

function createInquiryReviewRepository() {
  return new PostgresInquiryReviewRepository(getDatabasePool());
}

function createProposalDraftRepository() {
  return new PostgresProposalDraftRepository(getDatabasePool());
}

export async function createPersistedProposalDraftUseCase(
  inquiryId: string,
  selections: readonly CatalogSelection[],
) {
  return createProposalDraft(
    {
      reviewRepository: createInquiryReviewRepository(),
      catalogProvider: new StaticCatalogProvider(),
      proposalDraftRepository: createProposalDraftRepository(),
      generateId: randomUUID,
      now: () => new Date(),
    },
    {
      inquiryId,
      selections,
    },
  );
}

export async function getPersistedProposalDraftUseCase(id: string) {
  return getProposalDraft(
    {
      proposalDraftRepository: createProposalDraftRepository(),
    },
    id,
  );
}
