import { NextResponse } from "next/server";

import type { ProposalDraft } from "@proposal-agent/domain";

export function proposalResponse(proposal: ProposalDraft) {
  return {
    id: proposal.id,
    inquiryId: proposal.inquiryId,
    status: proposal.status,
    catalogVersion: proposal.catalogVersion,
    resolvedInquiry: proposal.resolvedInquiry,
    selections: proposal.selections,
    pricing: proposal.pricing,
    createdAt: proposal.createdAt.toISOString(),
  };
}

export function apiError(code: string, message: string, status: number): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
    },
  );
}
