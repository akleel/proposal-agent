import { z } from "zod";

export const proposalDraftIdSchema = z.string().uuid();

export type ProposalDraftIdContract = z.infer<typeof proposalDraftIdSchema>;
