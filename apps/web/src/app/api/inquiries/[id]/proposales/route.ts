import { consumeDemoWriteRateLimit } from "@/lib/server/demo-rate-limit";
import { getPersistedResolvedInquiryUseCase } from "@/lib/server/inquiries";
import {
  createProposalesProposal,
  ProposalesApiError,
  type ProposalesProductSelection,
} from "@/lib/server/proposales";

import { inquiryIdSchema } from "@proposal-agent/contracts";
import { NextResponse } from "next/server";

interface ProposalesInquiryRouteContext {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSelections(value: unknown): readonly ProposalesProductSelection[] | null {
  if (!isRecord(value) || !Array.isArray(value.selections)) {
    return null;
  }

  const selections: ProposalesProductSelection[] = [];

  for (const selection of value.selections) {
    if (!isRecord(selection)) {
      return null;
    }

    const variationId = selection.variationId;
    const amount = selection.amount;

    if (
      typeof variationId !== "number" ||
      !Number.isSafeInteger(variationId) ||
      variationId <= 0 ||
      typeof amount !== "number" ||
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      return null;
    }

    selections.push({
      variationId,
      amount,
    });
  }

  return selections;
}

function errorResponse(code: string, message: string, status: number): NextResponse {
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

function statusForProposalesError(error: ProposalesApiError): number {
  switch (error.code) {
    case "CONFIGURATION_ERROR":
      return 503;

    case "INVALID_SELECTION":
      return 400;

    case "INVALID_RESPONSE":
    case "NETWORK_ERROR":
    case "UPSTREAM_ERROR":
      return 502;
  }
}

export async function POST(
  request: Request,
  context: ProposalesInquiryRouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const parsedId = inquiryIdSchema.safeParse(id);

  if (!parsedId.success) {
    return errorResponse("invalid_inquiry_id", "The inquiry identifier is invalid.", 400);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("invalid_json", "Request body must contain valid JSON.", 400);
  }

  const selections = parseSelections(body);

  if (!selections || selections.length === 0) {
    return errorResponse(
      "invalid_selection",
      "Select at least one Proposales product with a positive quantity.",
      400,
    );
  }

  try {
    const resolved = await getPersistedResolvedInquiryUseCase(parsedId.data);

    if (resolved.status === "not_extracted") {
      return errorResponse(
        "not_extracted",
        "Extract the inquiry before creating a Proposales proposal.",
        409,
      );
    }

    if (resolved.status === "review_required") {
      return errorResponse(
        "review_required",
        "Complete the human review before creating a Proposales proposal.",
        409,
      );
    }

    const rateLimit = await consumeDemoWriteRateLimit();

    if (!rateLimit.allowed) {
      return errorResponse(
        "rate_limited",
        "The public demo write limit has been reached. Please try again later.",
        429,
      );
    }

    const proposal = await createProposalesProposal(parsedId.data, resolved.inquiry, selections);

    return NextResponse.json(
      {
        proposales: proposal,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ProposalesApiError) {
      console.error(`POST /api/inquiries/${parsedId.data}/proposales failed: ${error.code}`, error);

      return errorResponse(
        error.code.toLowerCase(),
        error.message,
        statusForProposalesError(error),
      );
    }

    console.error(`POST /api/inquiries/${parsedId.data}/proposales failed.`, error);

    return errorResponse("internal_error", "The Proposales proposal could not be created.", 500);
  }
}
