"use server";

import { consumeDemoWriteRateLimit } from "@/lib/server/demo-rate-limit";

import { calculateInquiryPricingInputSchema } from "@proposal-agent/contracts";
import { PricingError } from "@proposal-agent/domain";
import { redirect } from "next/navigation";

import { createPersistedProposalDraftUseCase } from "@/lib/server/proposals";

import type { ProposalDraftActionState } from "./proposal-draft-types";

function errorState(message: string): ProposalDraftActionState {
  return {
    status: "error",
    message,
  };
}

function readPricingInput(formData: FormData) {
  const rawSelections = formData.getAll("catalogItemId");

  const selections = rawSelections.map((catalogItemId) => {
    const id = typeof catalogItemId === "string" ? catalogItemId : "";

    return {
      catalogItemId,
      occurrences: formData.get(`occurrences:${id}`),
    };
  });

  return calculateInquiryPricingInputSchema.safeParse({
    inquiryId: formData.get("inquiryId"),
    selections,
  });
}

export async function createProposalDraftAction(
  _previousState: ProposalDraftActionState,
  formData: FormData,
): Promise<ProposalDraftActionState> {
  const parsed = readPricingInput(formData);

  if (!parsed.success) {
    return errorState("The proposal draft selection is invalid.");
  }

  let draftId: string;

  try {
    const rateLimit = await consumeDemoWriteRateLimit();

    if (!rateLimit.allowed) {
      return errorState("The public demo write limit has been reached. Please try again later.");
    }

    const result = await createPersistedProposalDraftUseCase(
      parsed.data.inquiryId,
      parsed.data.selections,
    );

    if (result.status === "not_extracted") {
      return errorState("Run and save inquiry extraction before creating a proposal draft.");
    }

    if (result.status === "review_required") {
      return errorState("Complete deterministic human review before creating a proposal draft.");
    }

    draftId = result.draft.id;
  } catch (error) {
    if (error instanceof PricingError) {
      return errorState(
        "Authoritative pricing could not be recalculated. Recalculate pricing and try again.",
      );
    }

    return errorState("The proposal draft could not be persisted. Please try again.");
  }

  redirect(`/proposals/${draftId}`);
}
