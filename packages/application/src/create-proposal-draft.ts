import {
  calculatePricing,
  createProposalDraft as createProposalDraftSnapshot,
  type CatalogSelection,
  type ProposalDraft,
} from "@proposal-agent/domain";

import type {
  CatalogProvider,
} from "./catalog-provider";
import {
  getResolvedInquiry,
} from "./get-resolved-inquiry";
import type {
  InquiryReviewRepository,
} from "./inquiry-review-repository";
import type {
  ProposalDraftRepository,
} from "./proposal-draft-repository";

export interface CreateProposalDraftInput {
  readonly inquiryId: string;
  readonly selections:
    readonly CatalogSelection[];
}

export type CreateProposalDraftResult =
  | {
      readonly status:
        "not_extracted";
    }
  | {
      readonly status:
        "review_required";
    }
  | {
      readonly status:
        "ready";
      readonly draft:
        ProposalDraft;
    };

export interface CreateProposalDraftDependencies {
  readonly reviewRepository:
    InquiryReviewRepository;
  readonly catalogProvider:
    CatalogProvider;
  readonly proposalDraftRepository:
    ProposalDraftRepository;
  readonly generateId:
    () => string;
  readonly now:
    () => Date;
}

export async function createProposalDraft(
  dependencies:
    CreateProposalDraftDependencies,
  input:
    CreateProposalDraftInput,
): Promise<CreateProposalDraftResult> {
  const resolved =
    await getResolvedInquiry(
      {
        reviewRepository:
          dependencies.reviewRepository,
      },
      input.inquiryId,
    );

  if (
    resolved.status ===
    "not_extracted"
  ) {
    return {
      status:
        "not_extracted",
    };
  }

  if (
    resolved.status ===
    "review_required"
  ) {
    return {
      status:
        "review_required",
    };
  }

  const catalog =
    await dependencies
      .catalogProvider
      .getCurrentCatalog();

  const pricing =
    calculatePricing({
      inquiry:
        resolved.inquiry,
      catalogVersion:
        catalog.version,
      catalog:
        catalog.items,
      selections:
        input.selections,
    });

  const draft =
    createProposalDraftSnapshot({
      id:
        dependencies.generateId(),
      inquiryId:
        input.inquiryId,
      resolvedInquiry:
        resolved.inquiry,
      selections:
        input.selections,
      pricing,
      createdAt:
        dependencies.now(),
    });

  await dependencies
    .proposalDraftRepository
    .create(
      draft,
    );

  return {
    status: "ready",
    draft,
  };
}
