import type { ProposalDraft } from "@proposal-agent/domain";

export interface ProposalDraftRepository {
  create(draft: ProposalDraft): Promise<void>;

  findById(id: string): Promise<ProposalDraft | null>;
}
