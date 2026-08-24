import type { InquiryExtraction } from "@proposal-agent/domain";

import type { InquiryExtractor } from "./inquiry-extractor";

export interface ExtractInquiryInput {
  readonly rawText: string;
}

export interface ExtractInquiryDependencies {
  readonly extractor: InquiryExtractor;
}

export async function extractInquiry(
  dependencies: ExtractInquiryDependencies,
  input: ExtractInquiryInput,
): Promise<InquiryExtraction> {
  const rawText = input.rawText.trim();

  if (!rawText) {
    throw new Error("Inquiry text cannot be empty.");
  }

  return dependencies.extractor.extract(rawText);
}
