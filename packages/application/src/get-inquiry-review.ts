import type {
  InquiryReviewState,
} from "./inquiry-review-state";
import {
  toInquiryReviewState,
} from "./inquiry-review-state";
import type {
  InquiryReviewRepository,
} from "./inquiry-review-repository";

export interface GetInquiryReviewDependencies {
  readonly reviewRepository: InquiryReviewRepository;
}

export async function getInquiryReview(
  dependencies: GetInquiryReviewDependencies,
  inquiryId: string,
): Promise<InquiryReviewState | null> {
  const review =
    await dependencies.reviewRepository.findByInquiryId(
      inquiryId,
    );

  return review
    ? toInquiryReviewState(review)
    : null;
}
