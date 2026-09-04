"use server";

import { consumeDemoAiRateLimit } from "@/lib/server/demo-rate-limit";

import {
  calculateInquiryPricingInputSchema,
  inquiryIdSchema,
  saveInquiryReviewDecisionInputSchema,
} from "@proposal-agent/contracts";
import { InquiryReviewDecisionError, PricingError } from "@proposal-agent/domain";
import { revalidatePath } from "next/cache";

import {
  calculatePersistedInquiryPricingUseCase,
  extractPersistedInquiryUseCase,
  getInquiryUseCase,
  savePersistedInquiryReviewDecisionUseCase,
} from "@/lib/server/inquiries";

import { type PricingActionState } from "./pricing-types";
import { serializeInquiryReview, type InquiryReviewActionState } from "./types";

function errorState(
  message: string,
  result: InquiryReviewActionState["result"] = null,
): InquiryReviewActionState {
  return {
    status: "error",
    message,
    result,
  };
}

function pricingErrorState(message: string): PricingActionState {
  return {
    status: "error",
    message,
    pricing: null,
    selections: null,
  };
}

function pricingErrorMessage(error: PricingError): string {
  switch (error.code) {
    case "EMPTY_SELECTIONS":
      return "Select at least one catalog item.";

    case "UNKNOWN_CATALOG_ITEM":
    case "INACTIVE_CATALOG_ITEM":
      return "One or more selected catalog items are unavailable.";

    case "DUPLICATE_SELECTION":
    case "INVALID_OCCURRENCES":
      return "The catalog selection is invalid. Check each occurrence value.";

    case "MISSING_GUEST_COUNT":
    case "INVALID_GUEST_COUNT":
    case "MISSING_ROOM_COUNT":
    case "INVALID_ROOM_COUNT":
    case "MISSING_START_DATE":
    case "MISSING_END_DATE":
      return "The reviewed inquiry is missing information required by the selected pricing basis.";

    case "INVALID_DATE_RANGE":
      return "The reviewed inquiry has an invalid date range for the selected pricing basis.";

    default:
      return "Pricing could not be calculated from the authoritative catalog.";
  }
}

export async function inquiryReviewWorkflowAction(
  previousState: InquiryReviewActionState,
  formData: FormData,
): Promise<InquiryReviewActionState> {
  const operation = formData.get("operation");

  const parsedId = inquiryIdSchema.safeParse(formData.get("inquiryId"));

  if (!parsedId.success) {
    return errorState("The inquiry identifier is invalid.", previousState.result);
  }

  if (operation === "extract") {
    try {
      const inquiry = await getInquiryUseCase(parsedId.data);

      if (!inquiry) {
        return errorState("The inquiry could not be found.", previousState.result);
      }

      const rateLimit = await consumeDemoAiRateLimit();

      if (!rateLimit.allowed) {
        return errorState(
          "The public demo AI usage limit has been reached. Please try again later.",
          previousState.result,
        );
      }

      const review = await extractPersistedInquiryUseCase(parsedId.data);

      if (!review) {
        return errorState("The inquiry could not be found.", previousState.result);
      }

      revalidatePath(`/inquiries/${parsedId.data}`);

      const result = serializeInquiryReview(review);

      return {
        status: "success",
        message:
          review.reviewIssues.length > 0
            ? "Extraction saved. Review the highlighted fields before downstream use."
            : "Extraction saved with no deterministic review flags.",
        result,
      };
    } catch (error) {
      console.error("Inquiry extraction failed.", error);

      return errorState(
        "AI extraction could not be completed. Check the server configuration and try again.",
        previousState.result,
      );
    }
  }

  if (operation !== "review") {
    return errorState("Unknown review operation.", previousState.result);
  }

  const parsedDecision = saveInquiryReviewDecisionInputSchema.safeParse({
    inquiryId: parsedId.data,
    field: formData.get("field"),
    kind: formData.get("kind"),
    correctedValue: formData.get("correctedValue") ?? "",
  });

  if (!parsedDecision.success) {
    return errorState("The review decision is invalid.", previousState.result);
  }

  try {
    const review = await savePersistedInquiryReviewDecisionUseCase(parsedDecision.data);

    revalidatePath(`/inquiries/${parsedId.data}`);

    const result = serializeInquiryReview(review);

    return {
      status: "success",
      message:
        review.unresolvedReviewIssues.length === 0
          ? "Human review saved. All deterministic review flags are resolved."
          : `Human review saved. ${review.unresolvedReviewIssues.length} review flag${review.unresolvedReviewIssues.length === 1 ? "" : "s"} remain unresolved.`,
      result,
    };
  } catch (error) {
    if (error instanceof InquiryReviewDecisionError) {
      return errorState(error.message, previousState.result);
    }

    return errorState("The human review decision could not be saved.", previousState.result);
  }
}

export async function calculateInquiryPricingAction(
  _previousState: PricingActionState,
  formData: FormData,
): Promise<PricingActionState> {
  const rawSelections = formData.getAll("catalogItemId");

  const selections = rawSelections.map((catalogItemId) => {
    const id = typeof catalogItemId === "string" ? catalogItemId : "";

    return {
      catalogItemId,
      occurrences: formData.get(`occurrences:${id}`),
    };
  });

  const parsed = calculateInquiryPricingInputSchema.safeParse({
    inquiryId: formData.get("inquiryId"),
    selections,
  });

  if (!parsed.success) {
    return pricingErrorState(
      "Select at least one catalog item and use positive whole-number occurrences.",
    );
  }

  try {
    const result = await calculatePersistedInquiryPricingUseCase(
      parsed.data.inquiryId,
      parsed.data.selections,
    );

    if (result.status === "not_extracted") {
      return pricingErrorState("Run and save inquiry extraction before calculating pricing.");
    }

    if (result.status === "review_required") {
      return pricingErrorState(
        "Complete the deterministic human review before calculating pricing.",
      );
    }

    return {
      status: "success",
      message: `Pricing calculated deterministically from catalog ${result.pricing.catalogVersion}.`,
      pricing: result.pricing,
      selections: parsed.data.selections,
    };
  } catch (error) {
    if (error instanceof PricingError) {
      return pricingErrorState(pricingErrorMessage(error));
    }

    return pricingErrorState("Pricing could not be calculated. Please try again.");
  }
}
