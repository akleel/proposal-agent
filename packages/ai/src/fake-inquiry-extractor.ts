import type { InquiryExtractor } from "@proposal-agent/application";
import type { InquiryExtraction } from "@proposal-agent/domain";

/**
 * Deterministic development and test adapter.
 *
 * It intentionally performs no interpretation. A configured extraction is
 * returned for every input so application behavior can be exercised without
 * a model provider, network access, prompts, or nondeterministic output.
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
