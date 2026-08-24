import type { InquiryExtraction } from "@proposal-agent/domain";

export interface InquiryExtractor {
  extract(rawText: string): Promise<InquiryExtraction>;
}
