import {
  resolveReviewedInquiry,
  type ResolvedInquiry,
} from "@proposal-agent/domain";

import type {
  InquiryReviewRepository,
} from "./inquiry-review-repository";

export type GetResolvedInquiryResult =
  | {
      readonly status:
        "not_extracted";
    }
  | {
      readonly status:
        "review_required";
    }
  | {
      readonly status: "ready";
      readonly inquiry:
        ResolvedInquiry;
    };

export interface GetResolvedInquiryDependencies {
  readonly reviewRepository:
    InquiryReviewRepository;
}

export async function getResolvedInquiry(
  dependencies:
    GetResolvedInquiryDependencies,
  inquiryId: string,
): Promise<GetResolvedInquiryResult> {
  const review =
    await dependencies.reviewRepository.findByInquiryId(
      inquiryId,
    );

  if (!review) {
    return {
      status: "not_extracted",
    };
  }

  const inquiry =
    resolveReviewedInquiry(
      review.extraction,
      review.decisions,
    );

  if (!inquiry) {
    return {
      status: "review_required",
    };
  }

  return {
    status: "ready",
    inquiry,
  };
}
