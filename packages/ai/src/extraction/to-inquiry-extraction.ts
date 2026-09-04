import { extractedInquirySchema } from "@proposal-agent/contracts";
import type { InquiryExtraction, ReviewableField } from "@proposal-agent/domain";

import type { ModelInquiryExtraction } from "./model-inquiry-extraction";

const REVIEW_CONFIDENCE_THRESHOLD = 0.95;

interface ModelField<T> {
  readonly value: T;
  readonly confidence: number;
  readonly source: string | null;
}

function stripDecorativeWrappingQuotes(source: string | null): string | null {
  if (source === null) {
    return null;
  }

  const trimmed = source.trim();

  const quotePairs: ReadonlyArray<readonly [string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
  ];

  for (const [opening, closing] of quotePairs) {
    if (
      trimmed.startsWith(opening) &&
      trimmed.endsWith(closing) &&
      trimmed.length > opening.length + closing.length
    ) {
      return trimmed.slice(opening.length, trimmed.length - closing.length);
    }
  }

  return trimmed;
}

function normalizeEvidence(value: string): string {
  return value.toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}

function hasSourceEvidence(rawText: string, source: string | null): boolean {
  if (source === null) {
    return false;
  }

  const normalizedInquiry = normalizeEvidence(rawText);
  const normalizedSource = normalizeEvidence(source);

  return normalizedSource.length > 0 && normalizedInquiry.includes(normalizedSource);
}

function toReviewableField<T>(rawText: string, field: ModelField<T>): ReviewableField<T> {
  const source = stripDecorativeWrappingQuotes(field.source);

  const requiresReview =
    field.value === null ||
    source === null ||
    field.confidence < REVIEW_CONFIDENCE_THRESHOLD ||
    !hasSourceEvidence(rawText, source);

  return {
    value: field.value,
    confidence: field.confidence,
    source,
    requiresReview,
  };
}
export function toInquiryExtraction(
  rawText: string,
  modelExtraction: ModelInquiryExtraction,
): InquiryExtraction {
  const candidate = {
    guests: toReviewableField(rawText, modelExtraction.guests),
    rooms: toReviewableField(rawText, modelExtraction.rooms),
    startDate: toReviewableField(rawText, modelExtraction.startDate),
    endDate: toReviewableField(rawText, modelExtraction.endDate),
    requirements: modelExtraction.requirements.map((requirement) =>
      toReviewableField(rawText, requirement),
    ),
  };

  return extractedInquirySchema.parse(candidate);
}
