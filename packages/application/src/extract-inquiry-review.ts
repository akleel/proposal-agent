import type {
  InquiryReviewState,
} from "./inquiry-review-state";
import {
  toInquiryReviewState,
} from "./inquiry-review-state";
import type {
  InquiryExtractor,
} from "./inquiry-extractor";
import type {
  InquiryRepository,
} from "./inquiry-repository";
import type {
  InquiryReviewRepository,
} from "./inquiry-review-repository";
import {
  extractInquiry,
} from "./extract-inquiry";

export interface ExtractInquiryReviewDependencies {
  readonly inquiryRepository: InquiryRepository;
  readonly reviewRepository: InquiryReviewRepository;
  readonly extractor: InquiryExtractor;
  readonly now: () => Date;
}

export async function extractInquiryReview(
  dependencies: ExtractInquiryReviewDependencies,
  inquiryId: string,
): Promise<InquiryReviewState | null> {
  const inquiry =
    await dependencies.inquiryRepository.findById(
      inquiryId,
    );

  if (!inquiry) {
    return null;
  }

  const extraction = await extractInquiry(
    {
      extractor: dependencies.extractor,
    },
    {
      rawText: inquiry.rawText,
    },
  );

  await dependencies.reviewRepository.replaceExtraction(
    inquiry.id,
    extraction,
    dependencies.now(),
  );

  const persisted =
    await dependencies.reviewRepository.findByInquiryId(
      inquiry.id,
    );

  if (!persisted) {
    throw new Error(
      "Persisted inquiry extraction could not be reloaded.",
    );
  }

  return toInquiryReviewState(persisted);
}
