import { consumeDemoWriteRateLimit } from "@/lib/server/demo-rate-limit";
import { createPersistedProposalDraftUseCase } from "@/lib/server/proposals";

import { calculateInquiryPricingInputSchema } from "@proposal-agent/contracts";
import { PricingError } from "@proposal-agent/domain";
import { NextResponse } from "next/server";

import { apiError, proposalResponse } from "./response";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("invalid_json", "Request body must contain valid JSON.", 400);
  }

  const parsed = calculateInquiryPricingInputSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "invalid_request",
      "Provide a valid inquiryId and at least one valid catalog selection.",
      400,
    );
  }

  try {
    const rateLimit = await consumeDemoWriteRateLimit();

    if (!rateLimit.allowed) {
      return apiError(
        "rate_limited",
        "The public demo write limit has been reached. Please try again later.",
        429,
      );
    }

    const result = await createPersistedProposalDraftUseCase(
      parsed.data.inquiryId,
      parsed.data.selections,
    );

    if (result.status === "not_extracted") {
      return apiError(
        "not_extracted",
        "The inquiry must be extracted before a proposal can be created.",
        409,
      );
    }

    if (result.status === "review_required") {
      return apiError(
        "review_required",
        "The inquiry review must be completed before a proposal can be created.",
        409,
      );
    }

    return NextResponse.json(
      {
        proposal: proposalResponse(result.draft),
      },
      {
        status: 201,
        headers: {
          Location: `/api/proposals/${result.draft.id}`,
        },
      },
    );
  } catch (error) {
    if (error instanceof PricingError) {
      return apiError("pricing_failed", error.message, 422);
    }

    console.error("POST /api/proposals failed.", error);

    return apiError("internal_error", "The proposal could not be created.", 500);
  }
}
