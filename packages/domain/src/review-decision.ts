import type { InquiryExtraction } from "./inquiry";
import { isValidIsoDate } from "./iso-date";

export type InquiryReviewDecisionKind = "accepted" | "corrected";

export type InquiryReviewResolvedValue = string | number;

export interface InquiryReviewDecision {
  readonly field: string;
  readonly kind: InquiryReviewDecisionKind;
  readonly resolvedValue: InquiryReviewResolvedValue;
  readonly reviewedAt: Date;
}

export interface CreateInquiryReviewDecisionInput {
  readonly field: string;
  readonly kind: InquiryReviewDecisionKind;
  readonly correctedValue?: string;
}

interface ReviewCandidate {
  readonly value: string | number | null;
  readonly requiresReview: boolean;
}

export class InquiryReviewDecisionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InquiryReviewDecisionError";
  }
}

function getReviewCandidate(extraction: InquiryExtraction, field: string): ReviewCandidate | null {
  switch (field) {
    case "guests":
      return extraction.guests;
    case "rooms":
      return extraction.rooms;
    case "startDate":
      return extraction.startDate;
    case "endDate":
      return extraction.endDate;
    case "budgetCents":
      return extraction.budgetCents;
    default:
      break;
  }

  const requirementMatch = /^requirements\.(\d+)$/.exec(field);

  if (!requirementMatch) {
    return null;
  }

  const index = Number(requirementMatch[1]);

  if (!Number.isSafeInteger(index)) {
    return null;
  }

  return extraction.requirements[index] ?? null;
}

function parseInteger(
  value: string,
  options: {
    readonly minimum: number;
    readonly label: string;
  },
): number {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    throw new InquiryReviewDecisionError(`${options.label} must be a whole number.`);
  }

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed) || parsed < options.minimum) {
    throw new InquiryReviewDecisionError(`${options.label} must be at least ${options.minimum}.`);
  }

  return parsed;
}

function parseIsoDate(value: string): string {
  const trimmed = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new InquiryReviewDecisionError("Date must use YYYY-MM-DD.");
  }

  if (!isValidIsoDate(trimmed)) {
    throw new InquiryReviewDecisionError("Date must be a valid calendar date.");
  }

  return trimmed;
}

function parseRequirement(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new InquiryReviewDecisionError("Requirement must not be empty.");
  }

  if (trimmed.length > 1_000) {
    throw new InquiryReviewDecisionError("Requirement must not exceed 1,000 characters.");
  }

  return trimmed;
}

function parseCorrectedValue(field: string, correctedValue: string): InquiryReviewResolvedValue {
  switch (field) {
    case "guests":
      return parseInteger(correctedValue, {
        minimum: 1,
        label: "Guests",
      });

    case "rooms":
      return parseInteger(correctedValue, {
        minimum: 0,
        label: "Rooms",
      });

    case "budgetCents":
      return parseInteger(correctedValue, {
        minimum: 0,
        label: "Budget in SEK minor units",
      });

    case "startDate":
    case "endDate":
      return parseIsoDate(correctedValue);

    default:
      break;
  }

  if (/^requirements\.\d+$/.test(field)) {
    return parseRequirement(correctedValue);
  }

  throw new InquiryReviewDecisionError("Unknown review field.");
}

export function createInquiryReviewDecision(
  extraction: InquiryExtraction,
  input: CreateInquiryReviewDecisionInput,
  reviewedAt: Date,
): InquiryReviewDecision {
  const candidate = getReviewCandidate(extraction, input.field);

  if (!candidate) {
    throw new InquiryReviewDecisionError("Unknown review field.");
  }

  if (!candidate.requiresReview) {
    throw new InquiryReviewDecisionError("This field does not require human review.");
  }

  if (input.kind === "accepted") {
    if (candidate.value === null) {
      throw new InquiryReviewDecisionError(
        "A missing AI value cannot be accepted. Enter a corrected value instead.",
      );
    }

    return {
      field: input.field,
      kind: "accepted",
      resolvedValue: candidate.value,
      reviewedAt,
    };
  }

  return {
    field: input.field,
    kind: "corrected",
    resolvedValue: parseCorrectedValue(input.field, input.correctedValue ?? ""),
    reviewedAt,
  };
}
