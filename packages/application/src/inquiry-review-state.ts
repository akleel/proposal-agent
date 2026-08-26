import {
  getReviewIssues,
  type ReviewIssue,
} from "@proposal-agent/domain";

import type {
  PersistedInquiryReview,
} from "./inquiry-review-repository";

export interface InquiryReviewState
  extends PersistedInquiryReview {
  readonly reviewIssues: readonly ReviewIssue[];
  readonly unresolvedReviewIssues:
    readonly ReviewIssue[];
}

export function toInquiryReviewState(
  review: PersistedInquiryReview,
): InquiryReviewState {
  const reviewIssues =
    getReviewIssues(review.extraction);

  const resolvedFields =
    new Set(
      review.decisions.map(
        (decision) => decision.field,
      ),
    );

  return {
    ...review,
    reviewIssues,
    unresolvedReviewIssues:
      reviewIssues.filter(
        (issue) =>
          !resolvedFields.has(issue.field),
      ),
  };
}
