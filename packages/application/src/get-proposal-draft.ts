import type { ProposalDraft } from "@proposal-agent/domain";

import type { ProposalDraftRepository } from "./proposal-draft-repository";

export interface GetProposalDraftDependencies {
  readonly proposalDraftRepository: ProposalDraftRepository;
}

export async function getProposalDraft(
  dependencies: GetProposalDraftDependencies,
  id: string,
): Promise<ProposalDraft | null> {
  return dependencies.proposalDraftRepository.findById(id);
}
