import type {
  InquiryExtraction,
  ReviewIssue,
} from "@proposal-agent/domain";

export interface InquiryExtractionResult {
  readonly extraction: InquiryExtraction;
  readonly reviewIssues: readonly ReviewIssue[];
}

export interface ExtractInquiryActionState {
  readonly status: "idle" | "success" | "error";
  readonly message: string;
  readonly result: InquiryExtractionResult | null;
}

export const initialExtractInquiryActionState: ExtractInquiryActionState = {
  status: "idle",
  message: "",
  result: null,
};
