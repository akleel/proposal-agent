"use server";

import {
  inquiryIdSchema,
  saveInquiryReviewDecisionInputSchema,
} from "@proposal-agent/contracts";
import {
  InquiryReviewDecisionError,
} from "@proposal-agent/domain";
import {
  revalidatePath,
} from "next/cache";

import {
  extractPersistedInquiryUseCase,
  savePersistedInquiryReviewDecisionUseCase,
} from "@/lib/server/inquiries";

import {
  serializeInquiryReview,
  type InquiryReviewActionState,
} from "./types";

function errorState(
  message: string,
  result:
    InquiryReviewActionState["result"] = null,
): InquiryReviewActionState {
  return {
    status: "error",
    message,
    result,
  };
}

export async function inquiryReviewWorkflowAction(
  previousState:
    InquiryReviewActionState,
  formData: FormData,
): Promise<InquiryReviewActionState> {
  const operation =
    formData.get("operation");

  const parsedId =
    inquiryIdSchema.safeParse(
      formData.get("inquiryId"),
    );

  if (!parsedId.success) {
    return errorState(
      "The inquiry identifier is invalid.",
      previousState.result,
    );
  }

  if (operation === "extract") {
    try {
      const review =
        await extractPersistedInquiryUseCase(
          parsedId.data,
        );

      if (!review) {
        return errorState(
          "The inquiry could not be found.",
          previousState.result,
        );
      }

      revalidatePath(
        `/inquiries/${parsedId.data}`,
      );

      const result =
        serializeInquiryReview(review);

      return {
        status: "success",
        message:
          review.reviewIssues.length > 0
            ? "Extraction saved. Review the highlighted fields before downstream use."
            : "Extraction saved with no deterministic review flags.",
        result,
      };
    } catch {
      return errorState(
        "AI extraction could not be completed. Check the server configuration and try again.",
        previousState.result,
      );
    }
  }

  if (operation !== "review") {
    return errorState(
      "Unknown review operation.",
      previousState.result,
    );
  }

  const parsedDecision =
    saveInquiryReviewDecisionInputSchema.safeParse({
      inquiryId:
        parsedId.data,
      field:
        formData.get("field"),
      kind:
        formData.get("kind"),
      correctedValue:
        formData.get("correctedValue") ??
        "",
    });

  if (!parsedDecision.success) {
    return errorState(
      "The review decision is invalid.",
      previousState.result,
    );
  }

  try {
    const review =
      await savePersistedInquiryReviewDecisionUseCase(
        parsedDecision.data,
      );

    revalidatePath(
      `/inquiries/${parsedId.data}`,
    );

    const result =
      serializeInquiryReview(review);

    return {
      status: "success",
      message:
        review.unresolvedReviewIssues.length === 0
          ? "Human review saved. All deterministic review flags are resolved."
          : `Human review saved. ${review.unresolvedReviewIssues.length} review flag${review.unresolvedReviewIssues.length === 1 ? "" : "s"} remain unresolved.`,
      result,
    };
  } catch (error) {
    if (
      error instanceof
      InquiryReviewDecisionError
    ) {
      return errorState(
        error.message,
        previousState.result,
      );
    }

    return errorState(
      "The human review decision could not be saved.",
      previousState.result,
    );
  }
}
