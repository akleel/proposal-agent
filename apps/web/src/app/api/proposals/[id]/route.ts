import { getPersistedProposalDraftUseCase } from "@/lib/server/proposals";

import { proposalDraftIdSchema } from "@proposal-agent/contracts";
import { NextResponse } from "next/server";

import { apiError, proposalResponse } from "../response";

interface ProposalRouteContext {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export async function GET(_request: Request, context: ProposalRouteContext): Promise<NextResponse> {
  const { id } = await context.params;

  const parsedId = proposalDraftIdSchema.safeParse(id);

  if (!parsedId.success) {
    return apiError("invalid_proposal_id", "The proposal identifier is invalid.", 400);
  }

  try {
    const proposal = await getPersistedProposalDraftUseCase(parsedId.data);

    if (!proposal) {
      return apiError("proposal_not_found", "The proposal could not be found.", 404);
    }

    return NextResponse.json({
      proposal: proposalResponse(proposal),
    });
  } catch (error) {
    console.error(`GET /api/proposals/${parsedId.data} failed.`, error);

    return apiError("internal_error", "The proposal could not be loaded.", 500);
  }
}
