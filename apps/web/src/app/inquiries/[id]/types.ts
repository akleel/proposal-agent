import type {
  InquiryReviewState,
} from "@proposal-agent/application";
import type {
  InquiryExtraction,
  InquiryReviewDecisionKind,
  ReviewIssue,
} from "@proposal-agent/domain";

export interface InquiryReviewDecisionResult {
  readonly field: string;
  readonly kind: InquiryReviewDecisionKind;
  readonly resolvedValue:
    | string
    | number;
  readonly reviewedAt: string;
}

export interface InquiryExtractionResult {
  readonly extraction: InquiryExtraction;
  readonly extractedAt: string;
  readonly reviewIssues:
    readonly ReviewIssue[];
  readonly unresolvedReviewIssues:
    readonly ReviewIssue[];
  readonly decisions:
    readonly InquiryReviewDecisionResult[];
}

export interface InquiryReviewActionState {
  readonly status:
    | "idle"
    | "success"
    | "error";
  readonly message: string;
  readonly result:
    InquiryExtractionResult | null;
}

export function serializeInquiryReview(
  review: InquiryReviewState,
): InquiryExtractionResult {
  return {
    extraction: review.extraction,
    extractedAt:
      review.extractedAt.toISOString(),
    reviewIssues:
      review.reviewIssues,
    unresolvedReviewIssues:
      review.unresolvedReviewIssues,
    decisions:
      review.decisions.map(
        (decision) => ({
          field: decision.field,
          kind: decision.kind,
          resolvedValue:
            decision.resolvedValue,
          reviewedAt:
            decision.reviewedAt.toISOString(),
        }),
      ),
  };
}

export function createInitialInquiryReviewActionState(
  result:
    InquiryExtractionResult | null,
): InquiryReviewActionState {
  return {
    status: "idle",
    message: "",
    result,
  };
}
