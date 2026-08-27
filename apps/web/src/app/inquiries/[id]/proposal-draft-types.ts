export interface ProposalDraftActionState {
  readonly status:
    | "idle"
    | "error";
  readonly message: string;
}

export const initialProposalDraftActionState:
  ProposalDraftActionState = {
    status: "idle",
    message: "",
  };
