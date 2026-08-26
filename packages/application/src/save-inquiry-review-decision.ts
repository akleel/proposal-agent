import {
  createInquiryReviewDecision,
  type InquiryReviewDecisionKind,
} from "@proposal-agent/domain";

import type {
  InquiryReviewState,
} from "./inquiry-review-state";
import {
  toInquiryReviewState,
} from "./inquiry-review-state";
import type {
  InquiryReviewRepository,
} from "./inquiry-review-repository";

export interface SaveInquiryReviewDecisionInput {
  readonly inquiryId: string;
  readonly field: string;
  readonly kind: InquiryReviewDecisionKind;
  readonly correctedValue?: string;
}

export interface SaveInquiryReviewDecisionDependencies {
  readonly reviewRepository: InquiryReviewRepository;
  readonly now: () => Date;
}

export async function saveInquiryReviewDecision(
  dependencies:
    SaveInquiryReviewDecisionDependencies,
  input: SaveInquiryReviewDecisionInput,
): Promise<InquiryReviewState> {
  const review =
    await dependencies.reviewRepository.findByInquiryId(
      input.inquiryId,
    );

  if (!review) {
    throw new Error(
      "Run AI extraction before saving a review decision.",
    );
  }

  const decisionInput =
    input.correctedValue === undefined
      ? {
          field: input.field,
          kind: input.kind,
        }
      : {
          field: input.field,
          kind: input.kind,
          correctedValue: input.correctedValue,
        };

  const decision =
    createInquiryReviewDecision(
      review.extraction,
      decisionInput,
      dependencies.now(),
    );

  await dependencies.reviewRepository.saveDecision(
    input.inquiryId,
    decision,
  );

  const updated =
    await dependencies.reviewRepository.findByInquiryId(
      input.inquiryId,
    );

  if (!updated) {
    throw new Error(
      "Persisted review could not be reloaded.",
    );
  }

  return toInquiryReviewState(updated);
}
