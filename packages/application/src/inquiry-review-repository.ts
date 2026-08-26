import type {
  InquiryExtraction,
  InquiryReviewDecision,
} from "@proposal-agent/domain";

export interface PersistedInquiryReview {
  readonly inquiryId: string;
  readonly extraction: InquiryExtraction;
  readonly extractedAt: Date;
  readonly decisions: readonly InquiryReviewDecision[];
}

export interface InquiryReviewRepository {
  replaceExtraction(
    inquiryId: string,
    extraction: InquiryExtraction,
    extractedAt: Date,
  ): Promise<void>;

  findByInquiryId(
    inquiryId: string,
  ): Promise<PersistedInquiryReview | null>;

  saveDecision(
    inquiryId: string,
    decision: InquiryReviewDecision,
  ): Promise<void>;
}
