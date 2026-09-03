import {
  createProposalDraft as validateProposalDraftSnapshot,
  type ProposalDraft,
} from "@proposal-agent/domain";

import type { ProposalDraftRepository } from "./proposal-draft-repository";

export interface ValidateProposalDraftDependencies {
  readonly proposalDraftRepository: ProposalDraftRepository;
}

export type ValidateProposalDraftResult =
  | {
      readonly status: "not_found";
    }
  | {
      readonly status: "valid";
      readonly draft: ProposalDraft;
    };

export async function validateProposalDraft(
  dependencies: ValidateProposalDraftDependencies,
  id: string,
): Promise<ValidateProposalDraftResult> {
  const persisted = await dependencies.proposalDraftRepository.findById(id);

  if (!persisted) {
    return {
      status: "not_found",
    };
  }

  const draft = validateProposalDraftSnapshot({
    id: persisted.id,
    inquiryId: persisted.inquiryId,
    resolvedInquiry: persisted.resolvedInquiry,
    selections: persisted.selections,
    pricing: persisted.pricing,
    createdAt: persisted.createdAt,
  });

  return {
    status: "valid",
    draft,
  };
}
