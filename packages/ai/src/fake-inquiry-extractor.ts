import type { InquiryExtractor } from "@proposal-agent/application";
import type { InquiryExtraction } from "@proposal-agent/domain";

/**
 * Deterministic adapter for tests and development.
 *
 * It performs no interpretation and makes no network calls.
 */
export class FakeInquiryExtractor implements InquiryExtractor {
  private readonly recordedInputs: string[] = [];

  public constructor(
    private readonly extraction: InquiryExtraction,
  ) {}

  public get inputs(): readonly string[] {
    return this.recordedInputs;
  }

  public async extract(
    rawText: string,
  ): Promise<InquiryExtraction> {
    this.recordedInputs.push(rawText);

    return this.extraction;
  }
}
